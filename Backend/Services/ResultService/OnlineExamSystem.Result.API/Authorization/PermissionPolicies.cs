using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Result.API.Authorization;

public static class PermissionPolicies
{
    public const string ResultsView = "Permission:Results-View";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(ResultsView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Results - View")));
    }
}
