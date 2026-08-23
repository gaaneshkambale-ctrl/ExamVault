using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Groups.Create;

public class CreateGroupHandler
{
    private readonly IGroupRepository _groupRepository;
    private readonly IValidator<CreateGroupCommand> _validator;

    public CreateGroupHandler(IGroupRepository groupRepository, IValidator<CreateGroupCommand> validator)
    {
        _groupRepository = groupRepository;
        _validator = validator;
    }

    public async Task<CreateGroupResult> HandleAsync(
        CreateGroupCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateGroupResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var existing = await _groupRepository.GetByNameAsync(command.Name, command.TenantId, cancellationToken);
        if (existing is not null)
        {
            return CreateGroupResult.Conflict();
        }

        var group = new Group { TenantId = command.TenantId, Name = command.Name };
        await _groupRepository.AddAsync(group, cancellationToken);
        await _groupRepository.SaveChangesAsync(cancellationToken);

        return CreateGroupResult.Ok(group);
    }
}
