using FluentValidation;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Sections.Update;

public class UpdateSectionValidator : AbstractValidator<UpdateSectionCommand>
{
    public UpdateSectionValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Instructions).MaximumLength(2000);

        RuleFor(x => x.DisplayOrder).GreaterThanOrEqualTo(0);
        RuleFor(x => x.QuestionCount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Marks).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DurationMinutes).GreaterThan(0);

        RuleFor(x => x.NavigationType)
            .IsEnumName(typeof(NavigationType), caseSensitive: false);

        RuleFor(x => x.NegativeMarks).GreaterThanOrEqualTo(0);
    }
}
