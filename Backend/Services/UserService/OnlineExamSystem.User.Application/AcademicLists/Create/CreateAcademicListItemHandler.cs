using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.AcademicLists.Create;

public class CreateAcademicListItemHandler
{
    private readonly IAcademicListItemRepository _repository;
    private readonly IValidator<CreateAcademicListItemCommand> _validator;

    public CreateAcademicListItemHandler(
        IAcademicListItemRepository repository,
        IValidator<CreateAcademicListItemCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<CreateAcademicListItemResult> HandleAsync(
        CreateAcademicListItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateAcademicListItemResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var expectedParentType = AcademicListHierarchy.ParentListTypeByType[command.ListType];
        if (expectedParentType is null)
        {
            if (command.ParentId is not null)
            {
                return CreateAcademicListItemResult.Invalid(
                    new[] { $"{command.ListType} is a top-level list and cannot have a parent." });
            }
        }
        else
        {
            if (command.ParentId is null)
            {
                return CreateAcademicListItemResult.Invalid(
                    new[] { $"Select a {expectedParentType} first." });
            }

            // GetByIdAsync goes through AcademicListItem's tenant query filter,
            // so a parentId belonging to another tenant comes back null here
            // exactly like a nonexistent one - no separate tenant check needed.
            var parent = await _repository.GetByIdAsync(command.ParentId.Value, cancellationToken);
            if (parent is null || parent.ListType != expectedParentType)
            {
                return CreateAcademicListItemResult.Invalid(new[] { "The selected parent is invalid." });
            }
        }

        var siblings = await _repository.GetAsync(command.ListType, command.ParentId, cancellationToken);
        if (siblings.Any(x => string.Equals(x.Value, command.Value.Trim(), StringComparison.OrdinalIgnoreCase)))
        {
            return CreateAcademicListItemResult.Conflict();
        }

        var item = new AcademicListItem
        {
            TenantId = command.TenantId,
            ListType = command.ListType,
            Value = command.Value.Trim(),
            ParentId = command.ParentId,
        };
        await _repository.AddAsync(item, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return CreateAcademicListItemResult.Ok(item);
    }
}
