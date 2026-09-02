namespace OnlineExamSystem.User.Application.Users.RolePermissions.Update;

public class UpdateRolePermissionsResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> Permissions { get; init; } = Array.Empty<string>();

    public static UpdateRolePermissionsResult Ok(IReadOnlyList<string> permissions) =>
        new() { Success = true, Permissions = permissions };

    public static UpdateRolePermissionsResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
