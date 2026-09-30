namespace OnlineExamSystem.User.Application.Tenants.UpdateRolePermissions;

public class UpdateTenantRolePermissionsResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsInvalidRole { get; init; }
    public IReadOnlyList<string>? Permissions { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }

    public static UpdateTenantRolePermissionsResult Ok(IReadOnlyList<string> permissions, DateTime? updatedAtUtc) =>
        new() { Success = true, Permissions = permissions, UpdatedAtUtc = updatedAtUtc };

    public static UpdateTenantRolePermissionsResult NotFound() => new() { IsNotFound = true };

    public static UpdateTenantRolePermissionsResult InvalidRole() => new() { IsInvalidRole = true };
}
