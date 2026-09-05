using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.AssignPlan;

public class AssignPlanToTenantResult
{
    public bool Success { get; init; }
    public bool TenantNotFound { get; init; }
    public bool PlanNotFound { get; init; }
    public bool PlanUnchanged { get; init; }
    public Tenant? Tenant { get; init; }
    public string? PreviousPlanName { get; init; }
    public string? NewPlanName { get; init; }

    public static AssignPlanToTenantResult Ok(Tenant tenant, bool planUnchanged, string? previousPlanName, string newPlanName) =>
        new()
        {
            Success = true,
            Tenant = tenant,
            PlanUnchanged = planUnchanged,
            PreviousPlanName = previousPlanName,
            NewPlanName = newPlanName,
        };

    public static AssignPlanToTenantResult NoTenant() => new() { TenantNotFound = true };

    public static AssignPlanToTenantResult NoPlan() => new() { PlanNotFound = true };
}
