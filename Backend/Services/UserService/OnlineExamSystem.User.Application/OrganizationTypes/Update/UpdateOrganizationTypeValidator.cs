using FluentValidation;

namespace OnlineExamSystem.User.Application.OrganizationTypes.Update;

public class UpdateOrganizationTypeValidator : AbstractValidator<UpdateOrganizationTypeCommand>
{
    public UpdateOrganizationTypeValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}
