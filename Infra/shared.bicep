// Shared resources used by every environment (dev/qa/prod). Deployed once,
// into its own resource group, independent of any single environment's
// lifecycle - deleting a dev/qa/prod resource group must never take this
// down.
targetScope = 'resourceGroup'

@description('Name of the shared Azure Container Registry. Must be globally unique, alphanumeric only.')
param acrName string = 'acrexamvaultshared'

@description('Location for the shared resources.')
param location string = resourceGroup().location

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output acrId string = acr.id
