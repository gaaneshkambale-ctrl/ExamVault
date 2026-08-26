using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Plans.Update;

public class UpdatePlanHandler
{
    private readonly IPlanRepository _planRepository;
    private readonly IValidator<UpdatePlanCommand> _validator;

    public UpdatePlanHandler(IPlanRepository planRepository, IValidator<UpdatePlanCommand> validator)
    {
        _planRepository = planRepository;
        _validator = validator;
    }

    public async Task<UpdatePlanResult> HandleAsync(UpdatePlanCommand command, CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdatePlanResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var plan = await _planRepository.GetByIdAsync(command.PlanId, cancellationToken);
        if (plan is null)
        {
            return UpdatePlanResult.NoPlan();
        }

        var existingWithName = await _planRepository.GetByNameAsync(command.Name, cancellationToken);
        if (existingWithName is not null && existingWithName.Id != command.PlanId)
        {
            return UpdatePlanResult.Conflict();
        }

        plan.Name = command.Name;
        plan.Description = command.Description;
        plan.IncludedFeatures = command.IncludedFeatures.Distinct().ToList();
        plan.UpdatedAtUtc = DateTime.UtcNow;
        await _planRepository.SaveChangesAsync(cancellationToken);

        return UpdatePlanResult.Ok(plan);
    }
}
