using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.API.Authorization;

public static class PermissionPolicies
{
    public const string SettingsView = "Permission:Settings-View";
    public const string SettingsEdit = "Permission:Settings-Edit";
    public const string ReportsView = "Permission:Reports-View";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(SettingsView, policy => policy.RequireAssertion(RequiresPermission("Settings - View")));
        options.AddPolicy(SettingsEdit, policy => policy.RequireAssertion(RequiresPermission("Settings - Edit")));
        options.AddPolicy(ReportsView, policy => policy.RequireAssertion(RequiresPermission("Reports - View")));
    }

    // SuperAdmin always passes. Otherwise the caller needs the permission
    // claim AND their token must be fresh relative to the tenant's current
    // PermissionVersion (IPermissionVersionGuard) - this is what lets a
    // revoked permission take effect against an already-issued access token
    // within one short cache cycle instead of waiting for its natural
    // expiry. The guard is resolved from the request's own DI scope via
    // context.Resource (the ASP.NET Core authorization middleware always
    // sets this to the current HttpContext for endpoint-based checks).
    private static Func<AuthorizationHandlerContext, Task<bool>> RequiresPermission(string permissionKey) =>
        async context =>
        {
            if (context.User.IsInRole("SuperAdmin"))
            {
                return true;
            }

            if (!context.User.HasClaim(PermissionClaimTypes.Permission, permissionKey))
            {
                return false;
            }

            if (context.Resource is not HttpContext httpContext)
            {
                return true;
            }

            var guard = httpContext.RequestServices.GetRequiredService<IPermissionVersionGuard>();
            return await guard.IsFreshAsync(context.User);
        };
}
