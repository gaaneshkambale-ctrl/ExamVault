namespace OnlineExamSystem.Shared.Common.Multitenancy;

// Shared (not per-service) so every microservice reads the exact same claim
// name once it starts trusting TenantId off the JWT - each service already
// validates the same shared-signing-key token independently (own
// AddJwtBearer call), so this constant is the one thing that must not drift
// between them.
public static class TenantClaimTypes
{
    public const string TenantId = "tenant_id";
}
