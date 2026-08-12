using FluentValidation;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Exams.Create;

public class CreateExamValidator : AbstractValidator<CreateExamCommand>
{
    public CreateExamValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Description)
            .MaximumLength(2000);

        RuleFor(x => x.ExamType)
            .IsEnumName(typeof(ExamType), caseSensitive: false);

        RuleFor(x => x.DurationMinutes)
            .GreaterThan(0);

        RuleFor(x => x.TotalMarks)
            .GreaterThan(0);

        RuleFor(x => x.PassingMarks)
            .GreaterThanOrEqualTo(0)
            .LessThanOrEqualTo(x => x.TotalMarks)
            .WithMessage("Passing marks cannot exceed total marks.");

        RuleFor(x => x.Instructions)
            .MaximumLength(2000);
    }
}
