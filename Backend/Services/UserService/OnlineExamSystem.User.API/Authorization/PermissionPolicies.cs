using Microsoft.AspNetCore.Authorization;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.User.API.Authorization;

// This service enforces the Users-View/Users-Edit RolePermissionCatalog
// keys; the other services each define their own PermissionPolicies.cs for
// the keys their own controllers own (Exams-Create/Edit and Questions-
// Create/Edit in ExamService/QuestionService, Results-View in ResultService,
// Settings-View/Edit here too, Reports-View wherever reports live). Across
// all services, 10 of the 12 RolePermissionCatalog keys are enforced this
// way today - only Dashboard-View and Certificates-View have no backend
// endpoint to gate. Registered alongside the existing role-based
// [Authorize] attributes (both apply - AND, not OR), same pattern as
// FeaturePolicies in this same folder. SuperAdmin always bypasses (not
// tied to any tenant's role-permission configuration); everyone else needs
// the matching "permission" claim, which JwtTokenService embeds at
// login/refresh from the caller's role's current RolePermission set.
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
