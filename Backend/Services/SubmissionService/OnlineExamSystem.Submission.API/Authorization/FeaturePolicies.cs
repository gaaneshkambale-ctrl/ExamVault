using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Submission.API.Authorization;

// One "Feature:{Name}" policy per gateable module, registered alongside the
// existing role-based [Authorize] attributes (both apply - AND, not OR) on
// Admin console actions. SuperAdmin always bypasses (they aren't tied to a
// tenant's plan); everyone else needs the matching "feature" claim, which
// User Service's JwtTokenService embeds at login/refresh from the tenant's
// current Plan. Duplicated per gated service rather than shared, matching
// this codebase's existing precedent (health checks, exception middleware).
public static class FeaturePolicies
{
    // [Authorize(Policy = ...)] requires a compile-time constant.
    public const string LiveMonitoring = "Feature:LiveMonitoring";
    public const string ExamSecurity = "Feature:ExamSecurity";
    public const string Proctoring = "Feature:Proctoring";
    public const string Exams = "Feature:Exams"; // grading is exam-authoring work

    // ByExam/ByUser genuinely serve both the Results console (Exam Results,
    // Student Results) and the Reports console (Exam Reports, Student
    // Reports) - a single Submission Service query neither page owns
    // exclusively, so this accepts either feature rather than picking one
    // arbitrarily.
    public const string ResultsOrReports = "Feature:ResultsOrReports";

    public static void AddFeaturePolicies(this AuthorizationOptions options)
    {
        foreach (var feature in Enum.GetValues<PlanFeature>())
        {
            options.AddPolicy(PolicyName(feature), policy =>
                policy.RequireAssertion(context =>
                    context.User.IsInRole("SuperAdmin") ||
                    context.User.HasClaim(FeatureClaimTypes.Feature, feature.ToString())));
        }

        options.AddPolicy(ResultsOrReports, policy =>
            policy.RequireAssertion(context =>
                context.User.IsInRole("SuperAdmin") ||
                context.User.HasClaim(FeatureClaimTypes.Feature, PlanFeature.Results.ToString()) ||
                context.User.HasClaim(FeatureClaimTypes.Feature, PlanFeature.Reports.ToString())));
    }

    public static string PolicyName(PlanFeature feature) => $"Feature:{feature}";
}
