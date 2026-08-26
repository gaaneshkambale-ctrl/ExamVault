using FluentValidation;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Assignments.Create;

public class CreateAssignmentValidator : AbstractValidator<CreateAssignmentCommand>
{
    public CreateAssignmentValidator()
    {
        RuleFor(x => x.ExamId).NotEmpty();

        RuleFor(x => x.TargetType)
            .IsEnumName(typeof(AssignmentTargetType), caseSensitive: false);

        RuleFor(x => x.UserIds)
            .Must(userIds => userIds is { Count: > 0 })
            .WithMessage("Select at least one student.")
            .When(x => string.Equals(x.TargetType, "Students", StringComparison.OrdinalIgnoreCase));

        RuleFor(x => x.GroupId)
            .NotNull()
            .WithMessage("A group must be selected.")
            .When(x => string.Equals(x.TargetType, "Batch", StringComparison.OrdinalIgnoreCase));

        RuleFor(x => x.EndAtUtc)
            .GreaterThan(x => x.StartAtUtc)
            .WithMessage("End date must be after the start date.");

        RuleFor(x => x.TimeZoneId).NotEmpty();

        RuleFor(x => x.MaxAttempts).GreaterThan(0);

        RuleFor(x => x.GraceTimeMinutes).GreaterThanOrEqualTo(0);
    }
}
