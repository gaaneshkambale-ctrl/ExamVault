using FluentValidation;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;

public class CreateNotificationValidator : AbstractValidator<CreateNotificationCommand>
{
    public CreateNotificationValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Message).NotEmpty().MaximumLength(2000);

        RuleFor(x => x.Type).IsEnumName(typeof(NotificationType), caseSensitive: false);
        RuleFor(x => x.SendTo).IsEnumName(typeof(NotificationSendToType), caseSensitive: false);

        RuleFor(x => x.UserIds)
            .Must(ids => ids is { Count: > 0 })
            .WithMessage("Select at least one student.")
            .When(x => string.Equals(x.SendTo, "SelectedStudents", StringComparison.OrdinalIgnoreCase));

        RuleFor(x => x.RelatedExamId)
            .NotNull()
            .WithMessage("An exam must be selected.")
            .When(x => string.Equals(x.SendTo, "ExamCandidates", StringComparison.OrdinalIgnoreCase));

        RuleFor(x => x.ScheduledAtUtc)
            .NotNull()
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Schedule time must be in the future.")
            .When(x => !x.SendNow);
    }
}
