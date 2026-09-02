namespace OnlineExamSystem.User.Application.Tenants.GetRolePermissions;

public class GetTenantRolePermissionsResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsInvalidRole { get; init; }
    public IReadOnlyList<string>? Permissions { get; init; }

    public static GetTenantRolePermissionsResult Ok(IReadOnlyList<string> permissions) =>
        new() { Success = true, Permissions = permissions };

    public static GetTenantRolePermissionsResult NotFound() => new() { IsNotFound = true };

    public static GetTenantRolePermissionsResult InvalidRole() => new() { IsInvalidRole = true };
}
