// Per-environment ExamVault infrastructure (dev/qa/prod). Deployed into its
// own resource group (e.g. rg-examvault-dev) so each environment can be torn
// down independently without touching the others or the shared ACR.
//
// Bootstraps every Container App with a public placeholder image
// (mcr.microsoft.com/azuredocs/containerapps-helloworld) - the CD pipeline's
// first run wires the ACR (via `az containerapp registry set`, system-assigned
// managed identity, no stored credentials) and replaces it with the real
// image. Deliberately NOT wired here: pointing an app at the ACR before its
// AcrPull role assignment (granted below, in the same deployment) has
// propagated made every Container App's creation hang and time out
// ("Operation expired") - confirmed by reproducing it with a throwaway probe
// app. The role assignment is still granted eagerly here so it has plenty of
// time to propagate before the CD pipeline's first deploy needs it.
targetScope = 'resourceGroup'

@description('Environment name: dev, qa, or prod. Used in every resource name.')
param environmentName string

@description('Location for every resource in this environment.')
param location string = 'centralus'

@description('Resource group name that hosts the shared Azure Container Registry.')
param sharedResourceGroupName string

@description('Name of the shared Azure Container Registry.')
param acrName string = 'acrexamvaultshared'

@description('SQL Server admin login.')
param sqlAdminLogin string = 'examvaultadmin'

@secure()
@description('SQL Server admin password.')
param sqlAdminPassword string

@secure()
@description('JWT signing key shared by every backend service.')
param jwtSigningKey string

param jwtIssuer string = 'ExamVault'
param jwtAudience string = 'ExamVault'

@secure()
@description('n8n webhook URL for user-service events (welcome/credential emails). Leave empty to disable email for this event source.')
param n8nUserWebhookUrl string = ''

@secure()
@description('n8n webhook URL for notification-service events (exam assigned/reminder emails).')
param n8nNotificationWebhookUrl string = ''

@secure()
@description('n8n webhook URL for the AI question-generation workflow.')
param n8nAiWebhookUrl string = ''

@secure()
@description('Metered.ca Secret Key - used server-side only to create private recording rooms and mint join tokens.')
param meteredApiKey string = ''

@description('Metered.ca app subdomain (yourapp.metered.live) - not a secret, just the room-URL prefix.')
param meteredAppDomain string = ''

@description('Bootstrap placeholder image every Container App starts with, before the CD pipeline pushes a real one.')
param placeholderImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var namePrefix = 'examvault-${environmentName}'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: acrName
  scope: resourceGroup(sharedResourceGroupName)
}

// ---------------------------------------------------------------------------
// Log Analytics + Container Apps Environment
// ---------------------------------------------------------------------------

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-${namePrefix}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-${namePrefix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

var internalDomain = containerAppsEnv.properties.defaultDomain

// ---------------------------------------------------------------------------
// Azure SQL: one logical server + one Basic elastic pool holding all 5 DBs
// ---------------------------------------------------------------------------

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: 'sql-${namePrefix}'
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
  }
}

resource sqlAllowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource elasticPool 'Microsoft.Sql/servers/elasticPools@2023-05-01-preview' = {
  parent: sqlServer
  name: 'ep-${namePrefix}'
  location: location
  sku: {
    name: 'BasicPool'
    tier: 'Basic'
    capacity: 50
  }
}

var databaseNames = ['UserDb', 'ExamDb', 'QuestionDb', 'SubmissionDb', 'NotificationDb']

resource databases 'Microsoft.Sql/servers/databases@2023-05-01-preview' = [for dbName in databaseNames: {
  parent: sqlServer
  name: 'ExamVault.${dbName}'
  location: location
  sku: {
    name: 'ElasticPool'
    tier: 'Basic'
  }
  properties: {
    elasticPoolId: elasticPool.id
  }
}]

func connectionString(fqdn string, dbName string, login string, password string) string => 'Server=tcp:${fqdn},1433;Database=ExamVault.${dbName};User Id=${login};Password=${password};TrustServerCertificate=True;'

var userDbConnection = connectionString(sqlServer.properties.fullyQualifiedDomainName, 'UserDb', sqlAdminLogin, sqlAdminPassword)
var examDbConnection = connectionString(sqlServer.properties.fullyQualifiedDomainName, 'ExamDb', sqlAdminLogin, sqlAdminPassword)
var questionDbConnection = connectionString(sqlServer.properties.fullyQualifiedDomainName, 'QuestionDb', sqlAdminLogin, sqlAdminPassword)
var submissionDbConnection = connectionString(sqlServer.properties.fullyQualifiedDomainName, 'SubmissionDb', sqlAdminLogin, sqlAdminPassword)
var notificationDbConnection = connectionString(sqlServer.properties.fullyQualifiedDomainName, 'NotificationDb', sqlAdminLogin, sqlAdminPassword)

// ---------------------------------------------------------------------------
// Azure Service Bus: Standard tier (Topics require Standard, Basic does not
// support them). Apps self-provision the "examvault.events" topic and their
// subscriptions on startup - nothing pre-created here.
// ---------------------------------------------------------------------------

resource serviceBus 'Microsoft.ServiceBus/namespaces@2022-10-01-preview' = {
  name: 'sb-${namePrefix}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}

var serviceBusConnection = listKeys('${serviceBus.id}/AuthorizationRules/RootManageSharedAccessKey', '2022-10-01-preview').primaryConnectionString

// ---------------------------------------------------------------------------
// Container Apps - one per backend service + frontend. Gateway and frontend
// get external ingress; every backend API is internal-only, reachable at
// https://<app-name>.internal.<environment-default-domain>.
// ---------------------------------------------------------------------------

resource userApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-user-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'user-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'sql-connection', value: userDbConnection }
        { name: 'jwt-signing-key', value: jwtSigningKey }
        { name: 'servicebus-connection', value: serviceBusConnection }
        { name: 'n8n-webhook-url', value: n8nUserWebhookUrl }
      ]
    }
    template: {
      containers: [
        {
          name: 'user-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'ConnectionStrings__UserDb', secretRef: 'sql-connection' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'Messaging__Provider', value: 'ServiceBus' }
            { name: 'ServiceBus__ConnectionString', secretRef: 'servicebus-connection' }
            { name: 'ServiceBus__TopicName', value: 'examvault.events' }
            { name: 'N8n__WebhookUrl', secretRef: 'n8n-webhook-url' }
            { name: 'Services__NotificationServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
            { name: 'App__FrontendBaseUrl', value: 'https://examvaults.in' }
            { name: 'App__BaseDomain', value: 'examvaults.in' }
            { name: 'App__Scheme', value: 'https' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module userApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-user-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: userApi.identity.principalId
    roleAssignmentName: guid(acr.id, userApi.id, 'AcrPull')
  }
}

resource examApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-exam-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'exam-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'sql-connection', value: examDbConnection }
        { name: 'jwt-signing-key', value: jwtSigningKey }
        { name: 'servicebus-connection', value: serviceBusConnection }
      ]
    }
    template: {
      containers: [
        {
          name: 'exam-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'ConnectionStrings__ExamDb', secretRef: 'sql-connection' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'Messaging__Provider', value: 'ServiceBus' }
            { name: 'ServiceBus__ConnectionString', secretRef: 'servicebus-connection' }
            { name: 'ServiceBus__TopicName', value: 'examvault.events' }
            { name: 'Services__UserServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/user-api/method' }
            { name: 'Services__QuestionServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/question-api/method' }
            { name: 'Services__NotificationServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module examApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-exam-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: examApi.identity.principalId
    roleAssignmentName: guid(acr.id, examApi.id, 'AcrPull')
  }
}

resource questionApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-question-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'question-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'sql-connection', value: questionDbConnection }
        { name: 'jwt-signing-key', value: jwtSigningKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'question-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'ConnectionStrings__QuestionDb', secretRef: 'sql-connection' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'Services__NotificationServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module questionApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-question-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: questionApi.identity.principalId
    roleAssignmentName: guid(acr.id, questionApi.id, 'AcrPull')
  }
}

resource aiApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-ai-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'ai-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'jwt-signing-key', value: jwtSigningKey }
        { name: 'n8n-webhook-url', value: n8nAiWebhookUrl }
      ]
    }
    template: {
      containers: [
        {
          name: 'ai-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'N8n__WebhookUrl', secretRef: 'n8n-webhook-url' }
            { name: 'Services__NotificationServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module aiApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-ai-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: aiApi.identity.principalId
    roleAssignmentName: guid(acr.id, aiApi.id, 'AcrPull')
  }
}

resource submissionApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-submission-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'submission-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'sql-connection', value: submissionDbConnection }
        { name: 'jwt-signing-key', value: jwtSigningKey }
        { name: 'metered-api-key', value: meteredApiKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'submission-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'ConnectionStrings__SubmissionDb', secretRef: 'sql-connection' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'Services__ExamServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/exam-api/method' }
            { name: 'Metered__ApiKey', secretRef: 'metered-api-key' }
            { name: 'Metered__AppDomain', value: meteredAppDomain }
            { name: 'Services__NotificationServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module submissionApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-submission-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: submissionApi.identity.principalId
    roleAssignmentName: guid(acr.id, submissionApi.id, 'AcrPull')
  }
}

resource resultApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-result-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'result-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'jwt-signing-key', value: jwtSigningKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'result-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'Services__ExamServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/exam-api/method' }
            { name: 'Services__QuestionServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/question-api/method' }
            { name: 'Services__SubmissionServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/submission-api/method' }
            { name: 'Services__NotificationServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module resultApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-result-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: resultApi.identity.principalId
    roleAssignmentName: guid(acr.id, resultApi.id, 'AcrPull')
  }
}

resource notificationApi 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-notification-api-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: false, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'notification-api', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'sql-connection', value: notificationDbConnection }
        { name: 'jwt-signing-key', value: jwtSigningKey }
        { name: 'n8n-webhook-url', value: n8nNotificationWebhookUrl }
      ]
    }
    template: {
      containers: [
        {
          name: 'notification-api'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'ConnectionStrings__NotificationDb', secretRef: 'sql-connection' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Jwt__AccessTokenMinutes', value: '15' }
            { name: 'Jwt__RefreshTokenDays', value: '7' }
            { name: 'Services__UserServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/user-api/method' }
            { name: 'Services__ExamServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/exam-api/method' }
            { name: 'N8n__WebhookUrl', secretRef: 'n8n-webhook-url' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module notificationApiAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-notification-api-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: notificationApi.identity.principalId
    roleAssignmentName: guid(acr.id, notificationApi.id, 'AcrPull')
  }
}

resource notificationWorker 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-notification-worker-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        { name: 'sql-connection', value: notificationDbConnection }
        { name: 'servicebus-connection', value: serviceBusConnection }
        { name: 'n8n-webhook-url', value: n8nNotificationWebhookUrl }
      ]
    }
    template: {
      containers: [
        {
          name: 'notification-worker'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'DOTNET_ENVIRONMENT', value: 'Azure' }
            { name: 'ConnectionStrings__NotificationDb', secretRef: 'sql-connection' }
            { name: 'Messaging__Provider', value: 'ServiceBus' }
            { name: 'ServiceBus__ConnectionString', secretRef: 'servicebus-connection' }
            { name: 'ServiceBus__TopicName', value: 'examvault.events' }
            { name: 'N8n__WebhookUrl', secretRef: 'n8n-webhook-url' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}

module notificationWorkerAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-notification-worker-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: notificationWorker.identity.principalId
    roleAssignmentName: guid(acr.id, notificationWorker.id, 'AcrPull')
  }
}

resource gateway 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-gateway-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 8080, transport: 'auto' }
      dapr: { enabled: true, appId: 'gateway', appProtocol: 'http', appPort: 8080 }
      secrets: [
        { name: 'jwt-signing-key', value: jwtSigningKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'gateway'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Azure' }
            { name: 'Jwt__Issuer', value: jwtIssuer }
            { name: 'Jwt__Audience', value: jwtAudience }
            { name: 'Jwt__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Cors__AllowedOrigins', value: 'https://ca-frontend-${environmentName}.${internalDomain}' }
            { name: 'Services__UserServiceBaseUrl', value: 'http://localhost:3500/v1.0/invoke/user-api/method' }
            { name: 'ReverseProxy__Clusters__users-cluster__Destinations__users-api__Address', value: 'http://localhost:3500/v1.0/invoke/user-api/method' }
            { name: 'ReverseProxy__Clusters__exams-cluster__Destinations__exams-api__Address', value: 'http://localhost:3500/v1.0/invoke/exam-api/method' }
            { name: 'ReverseProxy__Clusters__questions-cluster__Destinations__questions-api__Address', value: 'http://localhost:3500/v1.0/invoke/question-api/method' }
            { name: 'ReverseProxy__Clusters__ai-cluster__Destinations__ai-api__Address', value: 'http://localhost:3500/v1.0/invoke/ai-api/method' }
            { name: 'ReverseProxy__Clusters__submissions-cluster__Destinations__submissions-api__Address', value: 'http://localhost:3500/v1.0/invoke/submission-api/method' }
            { name: 'ReverseProxy__Clusters__results-cluster__Destinations__results-api__Address', value: 'http://localhost:3500/v1.0/invoke/result-api/method' }
            { name: 'ReverseProxy__Clusters__notifications-cluster__Destinations__notifications-api__Address', value: 'http://localhost:3500/v1.0/invoke/notification-api/method' }
          ]
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module gatewayAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-gateway-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: gateway.identity.principalId
    roleAssignmentName: guid(acr.id, gateway.id, 'AcrPull')
  }
}

resource frontend 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-frontend-${environmentName}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 80, transport: 'auto' }
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: placeholderImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
      scale: { minReplicas: 0, maxReplicas: 1 }
    }
  }
}

module frontendAcrPull 'modules/acrRoleAssignment.bicep' = {
  name: 'acrpull-frontend-${environmentName}'
  scope: resourceGroup(sharedResourceGroupName)
  params: {
    acrName: acrName
    principalId: frontend.identity.principalId
    roleAssignmentName: guid(acr.id, frontend.id, 'AcrPull')
  }
}

output gatewayUrl string = 'https://${gateway.properties.configuration.ingress.fqdn}'
output frontendUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output containerAppsEnvironmentDomain string = internalDomain
