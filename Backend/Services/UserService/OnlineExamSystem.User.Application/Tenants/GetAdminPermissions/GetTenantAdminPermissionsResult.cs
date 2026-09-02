namespace OnlineExamSystem.User.Application.Tenants.GetAdminPermissions;

public class GetTenantAdminPermissionsResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public IReadOnlyList<string>? Permissions { get; init; }

    public static GetTenantAdminPermissionsResult Ok(IReadOnlyList<string> permissions) =>
        new() { Success = true, Permissions = permissions };

    public static GetTenantAdminPermissionsResult NotFound() => new() { IsNotFound = true };
}
