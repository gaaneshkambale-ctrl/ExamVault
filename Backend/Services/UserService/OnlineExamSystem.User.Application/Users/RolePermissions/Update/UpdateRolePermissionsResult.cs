namespace OnlineExamSystem.User.Application.Users.RolePermissions.Update;

public class UpdateRolePermissionsResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> Permissions { get; init; } = Array.Empty<string>();
    public DateTime? UpdatedAtUtc { get; init; }

    public static UpdateRolePermissionsResult Ok(IReadOnlyList<string> permissions, DateTime updatedAtUtc) =>
        new() { Success = true, Permissions = permissions, UpdatedAtUtc = updatedAtUtc };

    public static UpdateRolePermissionsResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
