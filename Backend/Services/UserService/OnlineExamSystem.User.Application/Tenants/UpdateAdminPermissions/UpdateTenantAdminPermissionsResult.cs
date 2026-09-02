namespace OnlineExamSystem.User.Application.Tenants.UpdateAdminPermissions;

public class UpdateTenantAdminPermissionsResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string>? Permissions { get; init; }

    public static UpdateTenantAdminPermissionsResult Ok(IReadOnlyList<string> permissions) =>
        new() { Success = true, Permissions = permissions };

    public static UpdateTenantAdminPermissionsResult NotFound() => new() { IsNotFound = true };
}
