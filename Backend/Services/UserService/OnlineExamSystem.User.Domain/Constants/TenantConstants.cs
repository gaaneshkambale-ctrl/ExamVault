namespace OnlineExamSystem.User.Domain.Constants;

// Fixed, deterministic ids for the two tenants seeded by the AddTenants
// migration - deterministic so the same rows exist across every environment
// (local docker, Azure) without relying on insertion order.
public static class TenantConstants
{
    // Every pre-multi-tenancy row (and every self-registered Student, until
    // Phase 3 resolves the real tenant from the request subdomain) belongs
    // here.
    public static readonly Guid DefaultTenantId = new("11111111-1111-1111-1111-111111111111");
    public const string DefaultTenantName = "Default";
    public const string DefaultTenantSlug = "default";

    // Reserved home for Super Admin accounts, which manage tenants
    // themselves rather than belonging to one being managed.
    public static readonly Guid PlatformTenantId = new("22222222-2222-2222-2222-222222222222");
    public const string PlatformTenantName = "Platform";
    public const string PlatformTenantSlug = "platform";
}
