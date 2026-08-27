using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.Update;

public class UpdateTenantResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }
    public bool SlugAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Tenant? Tenant { get; init; }

    public static UpdateTenantResult Ok(Tenant tenant) => new() { Success = true, Tenant = tenant };

    public static UpdateTenantResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static UpdateTenantResult NotFound() => new() { TenantNotFound = true };

    public static UpdateTenantResult Conflict() => new() { SlugAlreadyExists = true };
}
