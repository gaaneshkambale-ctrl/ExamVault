# ExamVault Azure Infrastructure

Bicep templates for ExamVault's Azure footprint. One shared registry, then
one isolated resource group per environment (`dev` now; `qa`/`prod` are the
same `env.bicep` re-run with a different `environmentName` when we get there).

## Layout

- `shared.bicep` - the Azure Container Registry, shared by every environment.
  Deployed once into `rg-examvault-shared`.
- `env.bicep` - everything for one environment: Log Analytics, Container Apps
  Environment, Azure SQL server + Basic elastic pool (5 databases), Service
  Bus namespace (Standard tier - Topics require Standard), and 10 Container
  Apps (Gateway + 7 APIs + Notification Worker + frontend), each pulling
  images from the shared ACR via system-assigned managed identity (no
  registry credentials stored anywhere). Gateway and every backend API have
  Dapr enabled and talk to each other exclusively via Dapr's local service
  invocation (`http://localhost:3500/v1.0/invoke/<dapr-app-id>/method/...`)
  - see "Why Dapr, not direct HTTPS" below, this is load-bearing, not
    incidental.
- Default region is `centralus`, not the more geographically obvious
  `centralindia` - see that same section for why.
- `modules/acrRoleAssignment.bicep` - grants one Container App's identity
  `AcrPull` on the ACR. Has to be a module (not an inline resource) because
  the role assignment lives in the ACR's resource group, not the
  environment's.

Every Container App starts on the public placeholder image
`mcr.microsoft.com/azuredocs/containerapps-helloworld` - the `cd-dev.yml`
GitHub Actions workflow replaces it with a real image on the first push to
`dev` after this template is applied.

## Deploying a new environment

```bash
# One-time, only if it doesn't exist yet:
az group create --name rg-examvault-shared --location centralindia
az deployment group create --resource-group rg-examvault-shared --template-file shared.bicep

# Per environment (dev/qa/prod):
az group create --name rg-examvault-<env> --location centralus

az deployment group what-if \
  --resource-group rg-examvault-<env> \
  --template-file env.bicep \
  --parameters environmentName=<env> sharedResourceGroupName=rg-examvault-shared \
  --parameters sqlAdminPassword=<generate-a-strong-one> jwtSigningKey=<same-key-as-local-dev> \
  --parameters n8nUserWebhookUrl=<...> n8nNotificationWebhookUrl=<...> n8nAiWebhookUrl=<...>

# review the what-if output, then run the same command with `create` instead of `what-if`
```

None of the secure parameters (`sqlAdminPassword`, `jwtSigningKey`, the three
`n8n*WebhookUrl` values) are ever written to a file in this repo - pass them
inline on the CLI (or via a local, gitignored parameters file if preferred)
each time you deploy or redeploy.

**Note (Git Bash on Windows):** `az role assignment create` and similar
commands with a leading-`/` `--scope` argument get mangled by MSYS path
conversion (`/subscriptions/...` becomes `C:/Program Files/Git/subscriptions/...`).
Prefix those commands with `MSYS_NO_PATHCONV=1` when running from Git Bash.

**Note (Container App bootstrap):** `env.bicep` deliberately does NOT set a
`registries` entry on any Container App at create time, even though every
app gets a system-assigned identity + `AcrPull` role in the same deployment.
Doing so made every single app's first revision hang and fail with
`Operation expired` - the identity's `AcrPull` role assignment (created in
the same deployment, right after the app) hasn't propagated yet when the
platform validates the registry config during creation, confirmed by
reproducing it with a throwaway `az containerapp create` probe that succeeded
immediately once `registries` was removed. The ACR gets wired later, via
`az containerapp registry set`, in `cd-dev.yml`'s first real deploy - by
then the role assignment is long since propagated. If re-running this
template ever reintroduces a `registries` block on the bootstrap apps, expect
the same failure.

## Why Dapr, not direct HTTPS (and why `centralus`, not `centralindia`)

Two real, separately-diagnosed Azure issues, both hit deploying this dev
environment, both now worked around:

1. **General outbound HTTPS from a Container App was broken in the
   `centralindia` region** for this subscription - every outbound TLS
   handshake failed with a low-level `SslStream.EnsureFullTlsFrameAsync`
   exception, reproduced even calling Microsoft's own
   `management.azure.com`, reproduced again in a completely fresh
   Container Apps Environment (ruling out an instance-specific fault).
   Confirmed fixed by moving the environment to `centralus` - the identical
   test against `management.azure.com` succeeded there. Root cause never
   identified (never escalated to Azure Support), but the region switch is
   a clean, verified fix. This is why `location` defaults to `centralus`.

2. **Container-App-to-Container-App calls specifically still failed even in
   `centralus`** - a second, separate bug, unaffected by the region fix.
   Gateway calling another app's own public HTTPS URL (internal or
   external ingress, both tried) either hung for ~100s or failed instantly,
   regardless of TLS version, cert validation settings, or ingress type.
   Fix: enable Dapr on every app (`dapr: { enabled: true, appId, ... }` in
   `env.bicep`) and route all inter-service calls - Gateway's YARP cluster
   destinations AND every `Services__*BaseUrl` env var - through Dapr's
   local sidecar (`http://localhost:3500/v1.0/invoke/<dapr-app-id>/method`)
   instead of the app's own public URL. Dapr's sidecar-to-sidecar mesh
   doesn't traverse the same code path that was failing, and this was
   confirmed working end-to-end (real register -> login -> authenticated
   API call, all through Gateway) immediately after switching.

Practical upshot: because Dapr's mesh doesn't depend on an app's ingress
type at all, every backend API stays on internal-only ingress (its public
URL is never actually used for anything once Dapr is wired) - only Gateway
and the frontend need `external: true`. `Infra/../AzureStep.txt` at the
repo root has the full blow-by-blow of both investigations if this ever
needs revisiting (e.g. if Azure Support later identifies and fixes issue 1,
`centralindia` could be revisited; issue 2 might be worth retesting without
Dapr at that point too).

## Cost shape (dev, mostly idle / scale-to-zero)

- ACR Basic: ~$5/mo (shared across all environments, not per-env)
- SQL Basic elastic pool (50 eDTU, 5 DBs): ~$5-15/mo
- Service Bus Standard: ~$10/mo base (the one tier that isn't near-free -
  Basic doesn't support the Topics/Subscriptions this app uses)
- Container Apps Consumption: likely $0, inside the monthly free grant for
  a low-traffic dev environment

## CD pipeline

`.github/workflows/cd-dev.yml` builds every service's Docker image (plain
`docker build`/`docker push`, authenticated via `az acr login` - NOT
`az acr build`/ACR Tasks, which never created a single task run on this
subscription across every attempt, including on GitHub's own hosted
runners, root cause unresolved), pushes to the shared ACR tagged
`<service>:dev-<git-sha>`, and rolls each Container App to the new tag -
triggered on every push to the `dev` branch. **Confirmed working
end-to-end**, live: push -> build+test -> build+push all 10 images ->
deploy -> real login still returns a valid JWT against the freshly deployed
image. Authenticates to Azure via
OIDC (no stored client secret): an app registration
(`examvault-github-actions-dev`) with a federated credential scoped to
`repo:gaaneshkambale-ctrl@<ownerId>/ExamVault@<repoId>:ref:refs/heads/dev`
(GitHub's actual OIDC subject claim includes immutable numeric owner/repo
IDs, not just the names - get the real value from the `AADSTS700213` error
on a failed run rather than guessing), granted `Contributor` on
`rg-examvault-dev` and `AcrPush` on the shared registry.

`AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID` are hardcoded
directly in `cd-dev.yml`'s `env:` block rather than passed as GitHub repo
secrets. This is intentional, not a shortcut: none of the three is actually
sensitive - they're identifiers, not credentials. The real security boundary
is the federated credential's subject restriction
(`repo:gaaneshkambale-ctrl/ExamVault:ref:refs/heads/dev`, configured on the
Azure AD app, not in this repo) - only a workflow run on that exact repo and
branch can ever exchange a token, regardless of who can see these three
values. (This also sidesteps a real, unresolved problem hit in practice:
repo secrets set via the GitHub UI never reached `azure/login@v2` in several
attempts - `client-id`/`tenant-id` kept resolving empty despite the secrets
being correctly named and scoped - so hardcoding was also the pragmatic
fix, not just the "more correct" one.)

qa/prod get their own app registration + federated credential (scoped to
`ref:refs/heads/QA` / `ref:refs/heads/main`) and their own `cd-qa.yml` /
`cd-prod.yml` copied from this file with the branch/resource-group/app
names/IDs swapped, when we're ready to build those.
