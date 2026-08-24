namespace OnlineExamSystem.Shared.Common.Multitenancy;

// One claim of this type per included PlanFeature (multi-valued, same claim
// type repeated) - embedded by User Service at login/token-refresh from the
// caller's Tenant.Plan, read independently by every gated service's own
// authorization policies. SuperAdmin never gets this claim - policies bypass
// on role instead, since SuperAdmin isn't tied to any tenant's plan.
public static class FeatureClaimTypes
{
    public const string Feature = "feature";
}
