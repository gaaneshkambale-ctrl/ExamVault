using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.SetActiveStatus;

public class SetTenantActiveStatusResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public Tenant? Tenant { get; init; }

    public static SetTenantActiveStatusResult Ok(Tenant tenant) => new() { Success = true, Tenant = tenant };

    public static SetTenantActiveStatusResult NotFound() => new() { IsNotFound = true };
}
