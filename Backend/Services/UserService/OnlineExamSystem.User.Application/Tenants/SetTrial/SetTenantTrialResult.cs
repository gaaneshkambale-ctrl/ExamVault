using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.SetTrial;

public class SetTenantTrialResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsInvalid { get; init; }
    public string? ErrorMessage { get; init; }
    public Tenant? Tenant { get; init; }

    public static SetTenantTrialResult Ok(Tenant tenant) => new() { Success = true, Tenant = tenant };

    public static SetTenantTrialResult NotFound() => new() { IsNotFound = true };

    public static SetTenantTrialResult Invalid(string message) => new() { IsInvalid = true, ErrorMessage = message };
}
