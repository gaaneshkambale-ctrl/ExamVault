using FluentValidation;

namespace OnlineExamSystem.User.Application.AcademicLists.Create;

public class CreateAcademicListItemValidator : AbstractValidator<CreateAcademicListItemCommand>
{
    public CreateAcademicListItemValidator()
    {
        RuleFor(x => x.Value).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ListType)
            .Must(AcademicListHierarchy.IsValidListType)
            .WithMessage("List type must be one of Program, Department, Semester, Division.");
    }
}
