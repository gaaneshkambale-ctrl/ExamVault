using FluentValidation;

namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAcademicConfig;

public class UpdateOrganizationAcademicConfigValidator : AbstractValidator<UpdateOrganizationAcademicConfigCommand>
{
    public UpdateOrganizationAcademicConfigValidator()
    {
        RuleFor(x => x.AcademicFields).Must(f => f.Count <= 100).WithMessage("Too many academic fields.");
        RuleForEach(x => x.AcademicFields.Values).MaximumLength(500);
        RuleFor(x => x.ResultFields).Must(f => f.Count <= 100).WithMessage("Too many result fields.");
        RuleForEach(x => x.ResultFields).MaximumLength(100);
    }
}
