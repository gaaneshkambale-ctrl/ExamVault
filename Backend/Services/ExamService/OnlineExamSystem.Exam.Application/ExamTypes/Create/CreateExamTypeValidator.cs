using FluentValidation;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Create;

public class CreateExamTypeValidator : AbstractValidator<CreateExamTypeCommand>
{
    public CreateExamTypeValidator()
    {
        // Matches the Add/Edit Exam Type modal's own NAME_PATTERN
        // (ManageExamTypes.tsx) - letters and spaces only, so "Practice
        // Exam" passes but "Mock Test 1" or "Exam-A" don't.
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(100)
            .Matches(@"^[\p{L}][\p{L} ]*$")
            .WithMessage("Name can only contain letters and spaces.");

        RuleFor(x => x.Purpose)
            .MaximumLength(500);

        // These 4 are per-type overrides of the platform's own Exam Defaults
        // (blank/null is fine - it just means "use the platform default"),
        // but whatever IS supplied has to be a sane value, since it silently
        // pre-fills every exam created with this type otherwise. Mirrors the
        // range rules the frontend's own validate() applies (ManageExamTypes.tsx).
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
