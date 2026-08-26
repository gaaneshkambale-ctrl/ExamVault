using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.Create;

public class CreateTenantResult
{
    public bool Success { get; init; }
    public bool SlugAlreadyExists { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public Tenant? Tenant { get; init; }

    public static CreateTenantResult Ok(Tenant tenant) => new() { Success = true, Tenant = tenant };

    public static CreateTenantResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateTenantResult Conflict() => new() { SlugAlreadyExists = true };
}
