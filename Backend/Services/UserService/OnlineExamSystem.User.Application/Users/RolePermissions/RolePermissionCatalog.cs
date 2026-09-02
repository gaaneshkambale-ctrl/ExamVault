namespace OnlineExamSystem.User.Application.Users.RolePermissions;

// Server-side mirror of the frontend's constants/cosmeticRolePermissions.ts
// - kept in sync manually since this whole feature is a persisted preview,
// not a real permission-enforcement system. The role list and permission
// keys here are also the allow-list UpdateRolePermissionsValidator checks
// against, and DefaultsForRole is the one-time seed GetAllRolePermissionsHandler
// writes the first time a tenant ever touches this feature.
public static class RolePermissionCatalog
{
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
