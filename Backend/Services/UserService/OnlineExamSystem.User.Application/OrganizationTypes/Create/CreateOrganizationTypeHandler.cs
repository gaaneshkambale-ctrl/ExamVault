using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Create;

public class CreateOrganizationTypeHandler
{
    private readonly IOrganizationTypeRepository _organizationTypeRepository;
    private readonly IValidator<CreateOrganizationTypeCommand> _validator;

    public CreateOrganizationTypeHandler(
        IOrganizationTypeRepository organizationTypeRepository,
        IValidator<CreateOrganizationTypeCommand> validator)
    {
        _organizationTypeRepository = organizationTypeRepository;
        _validator = validator;
    }

    public async Task<CreateOrganizationTypeResult> HandleAsync(
        CreateOrganizationTypeCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateOrganizationTypeResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var existing = await _organizationTypeRepository.GetByNameAsync(command.Name, cancellationToken);
        if (existing is not null)
        {
            return CreateOrganizationTypeResult.Conflict();
        }

        var organizationType = new OrganizationType
        {
            Name = command.Name,
            SortOrder = command.SortOrder,
            CreatedByUserId = command.CreatedByUserId,
        };
        await _organizationTypeRepository.AddAsync(organizationType, cancellationToken);
        await _organizationTypeRepository.SaveChangesAsync(cancellationToken);

        return CreateOrganizationTypeResult.Ok(organizationType);
    }
}
