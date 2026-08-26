using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Plans.Create;

public class CreatePlanHandler
{
    private readonly IPlanRepository _planRepository;
    private readonly IValidator<CreatePlanCommand> _validator;

    public CreatePlanHandler(IPlanRepository planRepository, IValidator<CreatePlanCommand> validator)
    {
        _planRepository = planRepository;
        _validator = validator;
    }

    public async Task<CreatePlanResult> HandleAsync(CreatePlanCommand command, CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreatePlanResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var existing = await _planRepository.GetByNameAsync(command.Name, cancellationToken);
        if (existing is not null)
        {
            return CreatePlanResult.Conflict();
        }

        var plan = new Plan
        {
            Name = command.Name,
            Description = command.Description,
            IncludedFeatures = command.IncludedFeatures.Distinct().ToList(),
        };
        await _planRepository.AddAsync(plan, cancellationToken);
        await _planRepository.SaveChangesAsync(cancellationToken);

        return CreatePlanResult.Ok(plan);
    }
}
