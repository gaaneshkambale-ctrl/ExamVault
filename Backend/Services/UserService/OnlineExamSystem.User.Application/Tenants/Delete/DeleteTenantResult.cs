namespace OnlineExamSystem.User.Application.Tenants.Delete;

public class DeleteTenantResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }
    public bool CannotDeletePlatformTenant { get; init; }

    public static DeleteTenantResult Ok() => new() { Success = true };

    public static DeleteTenantResult NotFound() => new() { TenantNotFound = true };

    public static DeleteTenantResult Protected() => new() { CannotDeletePlatformTenant = true };
}
