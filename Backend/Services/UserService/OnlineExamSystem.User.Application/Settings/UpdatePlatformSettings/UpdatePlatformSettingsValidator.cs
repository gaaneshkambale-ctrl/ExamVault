using FluentValidation;

namespace OnlineExamSystem.User.Application.Settings.UpdatePlatformSettings;

public class UpdatePlatformSettingsValidator : AbstractValidator<UpdatePlatformSettingsCommand>
{
    public UpdatePlatformSettingsValidator()
    {
        RuleFor(x => x.PlatformName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PlatformTagline).MaximumLength(300);

        RuleFor(x => x.PasswordMinLength).InclusiveBetween(6, 64);
        RuleFor(x => x.SessionTimeoutMinutes).InclusiveBetween(5, 1440);
        RuleFor(x => x.MaxLoginAttempts).InclusiveBetween(3, 20);
        RuleFor(x => x.LockoutMinutes).InclusiveBetween(1, 1440);
        RuleFor(x => x.DefaultTrialDurationDays).InclusiveBetween(1, 365);

        RuleFor(x => x.DefaultMaxUsers).GreaterThan(0).When(x => x.DefaultMaxUsers is not null);
        RuleFor(x => x.DefaultMaxExams).GreaterThan(0).When(x => x.DefaultMaxExams is not null);
        RuleFor(x => x.DefaultMaxStudents).GreaterThan(0).When(x => x.DefaultMaxStudents is not null);

        RuleFor(x => x.N8nWebhookUrl)
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
            .WithMessage("N8n Webhook URL must be a valid absolute URL.")
            .When(x => !string.IsNullOrWhiteSpace(x.N8nWebhookUrl));
    }
}
