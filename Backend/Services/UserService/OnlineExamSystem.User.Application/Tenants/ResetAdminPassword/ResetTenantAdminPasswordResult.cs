namespace OnlineExamSystem.User.Application.Tenants.ResetAdminPassword;

public class ResetTenantAdminPasswordResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }
    public bool UserNotFound { get; init; }
    public bool UserNotAdminOfTenant { get; init; }
    public string? TemporaryPassword { get; init; }

    public static ResetTenantAdminPasswordResult Ok(string temporaryPassword) =>
        new() { Success = true, TemporaryPassword = temporaryPassword };

    public static ResetTenantAdminPasswordResult TenantMissing() => new() { TenantNotFound = true };

    public static ResetTenantAdminPasswordResult UserMissing() => new() { UserNotFound = true };

    public static ResetTenantAdminPasswordResult NotAdminOfTenant() => new() { UserNotAdminOfTenant = true };
}
