using FluentValidation;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Exams.Update;

public class UpdateExamValidator : AbstractValidator<UpdateExamCommand>
{
    public UpdateExamValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.ExamCode)
            .MaximumLength(40);

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

        RuleFor(x => x.MaxAttempts)
            .GreaterThan(0);

        RuleFor(x => x.NegativeMarks)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.EndAtUtc)
            .GreaterThan(x => x.StartAtUtc)
            .When(x => x.StartAtUtc.HasValue && x.EndAtUtc.HasValue)
            .WithMessage("End date must be after the start date.");
    }
}
