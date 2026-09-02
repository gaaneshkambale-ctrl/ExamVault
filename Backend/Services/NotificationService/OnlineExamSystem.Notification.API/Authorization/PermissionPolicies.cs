using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.API.Authorization;

public static class PermissionPolicies
{
    public const string SettingsView = "Permission:Settings-View";
    public const string SettingsEdit = "Permission:Settings-Edit";
    public const string ReportsView = "Permission:Reports-View";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(SettingsView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Settings - View")));
        options.AddPolicy(SettingsEdit, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Settings - Edit")));
        options.AddPolicy(ReportsView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Reports - View")));
    }
}
