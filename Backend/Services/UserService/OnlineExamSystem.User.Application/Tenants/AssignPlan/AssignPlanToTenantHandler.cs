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

        // Real "upgrade/downgrade your quota" semantics on an actual plan
        // change - re-seeds the tenant's effective limits from the new
        // plan's own Max* fields, same source CreateTenantHandler uses.
        // Deliberately does NOT touch or remove any existing user/exam on a
        // downgrade that now exceeds the new limit - only NEW creation
        // requests are ever blocked (CreateUserHandler/CreateExamHandler),
        // never existing data. A no-op reassignment to the same plan skips
        // this entirely, so it never clobbers a manual per-tenant override
        // the Super Admin made without also actually changing plans.
        if (!planUnchanged)
        {
            tenant.MaxExams = plan.MaxExams;
            tenant.MaxStudents = plan.MaxStudents;
            tenant.MaxAdmins = plan.MaxAdmins;
            tenant.MaxInstructors = plan.MaxInstructors;
        }

        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return AssignPlanToTenantResult.Ok(tenant, planUnchanged, previousPlan?.Name, plan.Name);
    }
}
