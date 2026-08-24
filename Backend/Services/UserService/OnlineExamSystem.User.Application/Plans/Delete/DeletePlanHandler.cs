using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Plans.Delete;

public class DeletePlanHandler
{
    private readonly IPlanRepository _planRepository;

    public DeletePlanHandler(IPlanRepository planRepository)
    {
        _planRepository = planRepository;
    }

    public async Task<DeletePlanResult> HandleAsync(DeletePlanCommand command, CancellationToken cancellationToken = default)
    {
        var plan = await _planRepository.GetByIdAsync(command.PlanId, cancellationToken);
        if (plan is null)
        {
            return DeletePlanResult.NoPlan();
        }

        // Restrict FK on Tenant.PlanId would throw a raw DB exception on
        // delete otherwise - checked explicitly so the caller gets a real
        // "still assigned to N organizations" answer instead of a 500.
        if (await _planRepository.IsAssignedToAnyTenantAsync(command.PlanId, cancellationToken))
        {
            return DeletePlanResult.StillInUse();
        }

        _planRepository.Remove(plan);
        await _planRepository.SaveChangesAsync(cancellationToken);

        return DeletePlanResult.Ok();
    }
}
