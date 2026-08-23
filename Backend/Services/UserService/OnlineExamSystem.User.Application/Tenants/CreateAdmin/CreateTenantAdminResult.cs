using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.CreateAdmin;

public class CreateTenantAdminResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }
    public bool EmailAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public AppUser? User { get; init; }

    public static CreateTenantAdminResult Ok(AppUser user) => new() { Success = true, User = user };

    public static CreateTenantAdminResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateTenantAdminResult NotFound() => new() { TenantNotFound = true };

    public static CreateTenantAdminResult Conflict() => new() { EmailAlreadyExists = true };
}
