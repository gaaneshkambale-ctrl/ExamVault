using FluentValidation;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public class SavePreferencesValidator : AbstractValidator<SavePreferencesCommand>
{
    public SavePreferencesValidator()
    {
        RuleFor(x => x.Preferences)
            .Must(items => items is { Count: > 0 })
            .WithMessage("At least one preference must be provided.");

        RuleFor(x => x.Preferences)
            .Must(items => items.Select(i => i.Type).Distinct().Count() == items.Count)
            .WithMessage("Each notification type may only appear once.")
            .When(x => x.Preferences is { Count: > 0 });
    }
}
