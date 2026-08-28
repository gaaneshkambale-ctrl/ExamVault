using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.AssignPlan;

public class AssignPlanToTenantHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IPlanRepository _planRepository;

    public AssignPlanToTenantHandler(ITenantRepository tenantRepository, IPlanRepository planRepository)
    {
        _tenantRepository = tenantRepository;
        _planRepository = planRepository;
    }

    public async Task<AssignPlanToTenantResult> HandleAsync(
        AssignPlanToTenantCommand command,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return AssignPlanToTenantResult.NoTenant();
        }

        var plan = await _planRepository.GetByIdAsync(command.PlanId, cancellationToken);
        if (plan is null)
        {
            return AssignPlanToTenantResult.NoPlan();
        }

        var planUnchanged = tenant.PlanId == command.PlanId;
        var previousPlan = planUnchanged ? plan : await _planRepository.GetByIdAsync(tenant.PlanId, cancellationToken);

        tenant.PlanId = command.PlanId;
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return AssignPlanToTenantResult.Ok(tenant, planUnchanged, previousPlan?.Name, plan.Name);
    }
}
