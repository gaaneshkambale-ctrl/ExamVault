// Grants a Container App's system-assigned managed identity AcrPull on the
// shared ACR. Deployed as a module scoped to the ACR's own resource group,
// since a role assignment's scope must match the Bicep file's target scope.
targetScope = 'resourceGroup'

param acrName string
param principalId string
param roleAssignmentName string

var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: acrName
}

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: roleAssignmentName
  scope: acr
  properties: {
    principalId: principalId
    roleDefinitionId: acrPullRoleId
    principalType: 'ServicePrincipal'
  }
}
