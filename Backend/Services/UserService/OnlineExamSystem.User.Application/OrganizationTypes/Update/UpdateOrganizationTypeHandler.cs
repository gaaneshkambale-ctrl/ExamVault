using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Update;

public class UpdateOrganizationTypeHandler
{
    private readonly IOrganizationTypeRepository _organizationTypeRepository;
    private readonly IValidator<UpdateOrganizationTypeCommand> _validator;

    public UpdateOrganizationTypeHandler(
        IOrganizationTypeRepository organizationTypeRepository,
        IValidator<UpdateOrganizationTypeCommand> validator)
    {
        _organizationTypeRepository = organizationTypeRepository;
        _validator = validator;
    }

    public async Task<UpdateOrganizationTypeResult> HandleAsync(
        UpdateOrganizationTypeCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateOrganizationTypeResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var organizationType = await _organizationTypeRepository.GetByIdAsync(command.OrganizationTypeId, cancellationToken);
        if (organizationType is null)
        {
            return UpdateOrganizationTypeResult.NoType();
        }

        var existingWithName = await _organizationTypeRepository.GetByNameAsync(command.Name, cancellationToken);
        if (existingWithName is not null && existingWithName.Id != command.OrganizationTypeId)
        {
            return UpdateOrganizationTypeResult.Conflict();
        }

        organizationType.Name = command.Name;
        organizationType.IsActive = command.IsActive;
        organizationType.SortOrder = command.SortOrder;
        organizationType.UpdatedAtUtc = DateTime.UtcNow;
        organizationType.UpdatedByUserId = command.UpdatedByUserId;
        await _organizationTypeRepository.SaveChangesAsync(cancellationToken);

        return UpdateOrganizationTypeResult.Ok(organizationType);
    }
}
