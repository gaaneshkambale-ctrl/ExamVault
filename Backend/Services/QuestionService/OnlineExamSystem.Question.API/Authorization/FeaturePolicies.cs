using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.API.Authorization;

// One "Feature:{Name}" policy per gateable module, registered alongside the
// existing role-based [Authorize] attributes (both apply - AND, not OR) on
// Admin console actions. SuperAdmin always bypasses (they aren't tied to a
// tenant's plan); everyone else needs the matching "feature" claim, which
// User Service's JwtTokenService embeds at login/refresh from the tenant's
// current Plan. Duplicated per gated service rather than shared, matching
// this codebase's existing precedent (health checks, exception middleware).
public static class FeaturePolicies
{
    // [Authorize(Policy = ...)] requires a compile-time constant, so gated
    // controllers in this service reference this rather than calling
    // PolicyName(PlanFeature.X) directly. Question bank management is part
    // of the "Exams" module (exam authoring), not its own feature.
    public const string Exams = "Feature:Exams";

    public static void AddFeaturePolicies(this AuthorizationOptions options)
    {
        foreach (var feature in Enum.GetValues<PlanFeature>())
        {
            options.AddPolicy(PolicyName(feature), policy =>
                policy.RequireAssertion(context =>
                    context.User.IsInRole("SuperAdmin") ||
                    context.User.HasClaim(FeatureClaimTypes.Feature, feature.ToString())));
        }
    }

    public static string PolicyName(PlanFeature feature) => $"Feature:{feature}";
}
