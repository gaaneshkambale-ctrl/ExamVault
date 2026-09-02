using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.API.Authorization;

// Phase 1 of enforced RBAC - only these 2 of the 12 RolePermissionCatalog
// keys are actually checked so far. Registered alongside the existing
// role-based [Authorize] attributes (both apply - AND, not OR), same
// pattern as FeaturePolicies in this same folder. SuperAdmin always
// bypasses (not tied to any tenant's role-permission configuration);
// everyone else needs the matching "permission" claim, which
// JwtTokenService embeds at login/refresh from the caller's role's current
// RolePermission set. Later phases add more named policies here the same
// way, rather than looping the whole catalog like FeaturePolicies does -
// deliberately not every permission is enforced yet.
public static class PermissionPolicies
{
    public const string UsersView = "Permission:Users-View";
    public const string UsersEdit = "Permission:Users-Edit";

    public static void AddPermissionPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(UsersView, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Users - View")));
        options.AddPolicy(UsersEdit, policy => policy.RequireAssertion(context =>
            context.User.IsInRole("SuperAdmin") ||
            context.User.HasClaim(PermissionClaimTypes.Permission, "Users - Edit")));
    }
}
