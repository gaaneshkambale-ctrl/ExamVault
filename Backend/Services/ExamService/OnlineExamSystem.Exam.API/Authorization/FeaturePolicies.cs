using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.API.Authorization;

// One "Feature:{Name}" policy per gateable module, registered alongside the
// existing role-based [Authorize] attributes (both apply - AND, not OR) on
// Admin console actions. SuperAdmin always bypasses (they aren't tied to a
// tenant's plan); everyone else needs the matching "feature" claim, which
// User Service's JwtTokenService embeds at login/refresh from the tenant's
// current Plan. Duplicated per gated service rather than shared, matching
// this codebase's existing precedent (health checks, exception middleware).
public static class FeaturePolicies
{
    // [Authorize(Policy = ...)] requires a compile-time constant, so each
    // gated controller in this service references these rather than calling
    // PolicyName(PlanFeature.X) directly.
    public const string Exams = "Feature:Exams";
    public const string ExamTypes = "Feature:ExamTypes";
    public const string Settings = "Feature:Settings";

    // ProctoringSettingsController.Update saves ONE shared entity that two
    // different pages edit different subsets of (Security Settings' exam-
    // environment fields, Proctoring Settings' camera/AI fields - see
    // ActionPlan.txt's "SPLIT LiveMonitoring" plan) - splitting the PUT
    // itself per-field wasn't warranted, so this mirrors Submission
    // Service's ResultsOrReports precedent: accept either feature rather
    // than picking one arbitrarily. Closes the reported gap (an org with
    // NEITHER feature could still save this settings row at all) without
    // blocking an org that legitimately has only one of the two.
    public const string ExamSecurityOrProctoring = "Feature:ExamSecurityOrProctoring";

    public static void AddFeaturePolicies(this AuthorizationOptions options)
    {
        foreach (var feature in Enum.GetValues<PlanFeature>())
        {
            options.AddPolicy(PolicyName(feature), policy =>
                policy.RequireAssertion(context =>
                    context.User.IsInRole("SuperAdmin") ||
                    context.User.HasClaim(FeatureClaimTypes.Feature, feature.ToString())));
        }

        options.AddPolicy(ExamSecurityOrProctoring, policy =>
            policy.RequireAssertion(context =>
                context.User.IsInRole("SuperAdmin") ||
                context.User.HasClaim(FeatureClaimTypes.Feature, PlanFeature.ExamSecurity.ToString()) ||
                context.User.HasClaim(FeatureClaimTypes.Feature, PlanFeature.Proctoring.ToString())));
    }

    public static string PolicyName(PlanFeature feature) => $"Feature:{feature}";
}
