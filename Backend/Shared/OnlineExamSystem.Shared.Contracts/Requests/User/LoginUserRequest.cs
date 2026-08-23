namespace OnlineExamSystem.Shared.Contracts.Requests.User;

// TenantSlug is optional so a single-tenant/local-dev caller (no subdomain
// resolved yet, Phase 3 of multi_tenant_saas.txt) keeps working unchanged -
// when provided, it scopes the email lookup to that tenant so the same
// email can exist in two different tenants without colliding.
public record LoginUserRequest(string Email, string Password, string? TenantSlug = null);
