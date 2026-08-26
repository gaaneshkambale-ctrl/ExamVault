namespace OnlineExamSystem.Shared.Common.Multitenancy;

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

    // Seeded alongside the two tenants above so every pre-subscription-plans
    // Tenant row (and every newly created one that doesn't pick a plan) has
    // a real Plan with every PlanFeature included - subscription gating
    // ships additive, no existing org loses access on migration day.
    public static readonly Guid FullAccessPlanId = new("33333333-3333-3333-3333-333333333333");
    public const string FullAccessPlanName = "Full Access";
}
