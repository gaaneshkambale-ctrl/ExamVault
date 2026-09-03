namespace OnlineExamSystem.Shared.Common.Multitenancy;

// One claim of this type per granted RolePermission key (multi-valued, same
// claim type repeated) - embedded by User Service at login/token-refresh
// from the caller's role's current RolePermission set, read independently
// by every gated service's own authorization policies. Same shape as
// FeatureClaimTypes, but a distinct authorization axis: Feature gates on
// tenant subscription plan, Permission gates on role/RBAC configuration.
public static class PermissionClaimTypes
{
    public const string Permission = "permission";

    // Single-valued - the issuing tenant's RolePermission "version" counter
    // (Tenant.PermissionVersion) at the moment this token was minted.
    // Downstream services compare this against the tenant's CURRENT version
    // (via a short-TTL cached lookup) to detect a token issued before a
    // permission change, without waiting for the token's natural expiry.
    public const string PermissionVersion = "permission_version";
}
