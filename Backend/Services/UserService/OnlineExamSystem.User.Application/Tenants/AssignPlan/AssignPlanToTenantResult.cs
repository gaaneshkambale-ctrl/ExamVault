using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.AssignPlan;

public class AssignPlanToTenantResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }
    public bool PlanNotFound { get; init; }
    public Tenant? Tenant { get; init; }

    public static AssignPlanToTenantResult Ok(Tenant tenant) => new() { Success = true, Tenant = tenant };

    public static AssignPlanToTenantResult NoTenant() => new() { TenantNotFound = true };

    public static AssignPlanToTenantResult NoPlan() => new() { PlanNotFound = true };
}
