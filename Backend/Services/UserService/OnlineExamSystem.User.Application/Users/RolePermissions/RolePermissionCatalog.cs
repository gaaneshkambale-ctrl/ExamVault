using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.RolePermissions;

// Server-side mirror of the frontend's constants/cosmeticRolePermissions.ts
// - kept in sync manually. Most of these 12 permissions are still a
// persisted preview only (not enforced) - "Users - View"/"Users - Edit" are
// the Phase 1 exception, actually checked via PermissionPolicies. The role
// list and permission keys here are also the allow-list
// UpdateRolePermissionsValidator checks against, and DefaultsForRole is the
// one-time seed GetAllRolePermissionsHandler writes the first time a tenant
// ever touches this feature (and the fallback GetForRoleAsync uses for a
// tenant that never has).
public static class RolePermissionCatalog
{
    // The real UserRole enum has no space ("SuperAdmin"); the catalog's
    // display/storage name does ("Super Admin") - bridges the two so
    // login/refresh can look up a real user's role's granted permissions.
    public static string CatalogRoleName(UserRole role) => role switch
    {
        UserRole.SuperAdmin => "Super Admin",
        _ => role.ToString(),
    };

    public static readonly IReadOnlyList<string> Roles =
    [
        "Super Admin",
        "Admin",
        "Instructor",
        "Student",
        "Viewer",
    ];

    public static readonly IReadOnlyList<string> Permissions =
    [
        "Dashboard - View",
        "Exams - Create",
        "Exams - Edit",
        "Questions - Create",
        "Questions - Edit",
        "Results - View",
        "Users - View",
        "Users - Edit",
        "Settings - View",
        "Settings - Edit",
        "Reports - View",
        "Certificates - View",
    ];

    public static IReadOnlyList<string> DefaultsForRole(string role) => role switch
    {
        "Super Admin" => Permissions,
        "Admin" => Permissions.Where(p => p != "Certificates - View").ToList(),
        "Instructor" =>
        [
            "Dashboard - View", "Exams - Create", "Exams - Edit",
            "Questions - Create", "Questions - Edit", "Results - View",
        ],
        "Student" => ["Dashboard - View", "Results - View", "Certificates - View"],
        "Viewer" => ["Dashboard - View", "Results - View", "Reports - View"],
        _ => [],
    };
}
