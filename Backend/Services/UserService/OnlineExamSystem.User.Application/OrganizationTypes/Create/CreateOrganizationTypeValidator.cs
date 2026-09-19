using FluentValidation;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Create;

public class CreateOrganizationTypeValidator : AbstractValidator<CreateOrganizationTypeCommand>
{
    public CreateOrganizationTypeValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}
