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
        plan.MonthlyPrice = command.MonthlyPrice;
        plan.AnnualPrice = command.AnnualPrice;
        plan.MaxStudents = command.MaxStudents;
        plan.MaxAdmins = command.MaxAdmins;
        plan.MaxInstructors = command.MaxInstructors;
        plan.MaxExams = command.MaxExams;
        plan.MaxQuestions = command.MaxQuestions;
        plan.MaxAiQuestionsPerMonth = command.MaxAiQuestionsPerMonth;
        plan.StorageGb = command.StorageGb;
        // Deliberately no cascade to tenants already assigned this plan -
        // matches the existing precedent (editing PlatformSettings'
        // DefaultMax* never retroactively changed existing tenants either).
        // A tenant's own effective limits only change on creation or an
        // explicit re-assignment (AssignPlanToTenantHandler).
        plan.UpdatedAtUtc = DateTime.UtcNow;
        plan.UpdatedByUserId = command.UpdatedByUserId;
        await _planRepository.SaveChangesAsync(cancellationToken);

        return UpdatePlanResult.Ok(plan);
    }
}
