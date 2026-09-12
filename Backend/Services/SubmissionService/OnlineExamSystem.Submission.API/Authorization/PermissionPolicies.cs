using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Submission.API.Authorization;

// Simple claim-check policies, no PermissionVersionGuard freshness check
// (unlike ExamService/QuestionService) - matches ResultService/UserService's
// own simpler PermissionPolicies.cs. A revoked permission here only takes
// effect on the caller's next login/refresh rather than within ~30s.
public static class PermissionPolicies
{
    public const string ResultsView = "Permission:Results-View";
    public const string LiveMonitoringView = "Permission:LiveMonitoring-View";
    public const string SecurityViolationsView = "Permission:SecurityViolations-View";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        // Reuses the same "Results - View" permission ResultService's own
        // ResultsController.ByExam checks - SubmissionsController.ByExam is
        // called server-to-server from there and its role list is already
        // kept in lockstep with it (see that controller's own comment); this
        // extends that same lockstep to the permission-catalog layer instead
        // of introducing a second, independently-togglable permission for
        // what is really one capability.
        options.AddPolicy(ResultsView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Results - View")));
        options.AddPolicy(LiveMonitoringView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Live Monitoring - View")));
        options.AddPolicy(SecurityViolationsView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Security Violations - View")));
    }
}
