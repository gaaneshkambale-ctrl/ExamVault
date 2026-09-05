namespace OnlineExamSystem.User.Application.Tenants.GetRolePermissions;

public class GetTenantRolePermissionsResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsInvalidRole { get; init; }
    public IReadOnlyList<string>? Permissions { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
    public Guid? UpdatedByUserId { get; init; }

    public static GetTenantRolePermissionsResult Ok(IReadOnlyList<string> permissions, DateTime? updatedAtUtc, Guid? updatedByUserId) =>
        new() { Success = true, Permissions = permissions, UpdatedAtUtc = updatedAtUtc, UpdatedByUserId = updatedByUserId };

    public static GetTenantRolePermissionsResult NotFound() => new() { IsNotFound = true };

    public static GetTenantRolePermissionsResult InvalidRole() => new() { IsInvalidRole = true };
}
