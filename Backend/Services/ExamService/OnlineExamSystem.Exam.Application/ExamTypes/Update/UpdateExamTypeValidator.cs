using FluentValidation;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Update;

public class UpdateExamTypeValidator : AbstractValidator<UpdateExamTypeCommand>
{
    public UpdateExamTypeValidator()
    {
        // Same name-format rule as CreateExamTypeValidator - see its own
        // comment.
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100)
            .Matches(@"^[\p{L}][\p{L} ]*$")
            .WithMessage("Name can only contain letters and spaces.");

        RuleFor(x => x.Purpose)
            .MaximumLength(500);

        // Same range rules as CreateExamTypeValidator - see its own comment.
        RuleFor(x => x.DefaultDurationMinutes)
            .GreaterThan(0)
            .WithMessage("Default duration must be greater than 0.")
            .When(x => x.DefaultDurationMinutes.HasValue);

        RuleFor(x => x.PassingScorePercent)
            .InclusiveBetween(0, 100)
            .WithMessage("Passing score must be between 0 and 100.")
            .When(x => x.PassingScorePercent.HasValue);

        RuleFor(x => x.DefaultMaxAttempts)
            .GreaterThan(0)
            .WithMessage("Default max attempts must be greater than 0.")
            .When(x => x.DefaultMaxAttempts.HasValue);

        RuleFor(x => x.NegativeMarkingValue)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Negative marking value cannot be negative.")
            .When(x => x.NegativeMarkingValue.HasValue);

        RuleFor(x => x.NegativeMarkingValue)
            .NotNull()
            .WithMessage("Enter a negative marking value, or turn negative marking off.")
            .When(x => x.NegativeMarkingEnabled == true);
    }
}
