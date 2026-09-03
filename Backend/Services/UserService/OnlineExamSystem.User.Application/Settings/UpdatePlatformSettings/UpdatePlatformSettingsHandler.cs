using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Settings.UpdatePlatformSettings;

public class UpdatePlatformSettingsHandler
{
    private readonly IPlatformSettingsRepository _repository;
    private readonly IValidator<UpdatePlatformSettingsCommand> _validator;

    public UpdatePlatformSettingsHandler(IPlatformSettingsRepository repository, IValidator<UpdatePlatformSettingsCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<UpdatePlatformSettingsResult> HandleAsync(
        UpdatePlatformSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdatePlatformSettingsResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var settings = await _repository.GetOrCreateAsync(cancellationToken);
        settings.PlatformName = command.PlatformName.Trim();
        settings.PlatformTagline = command.PlatformTagline.Trim();
        settings.AllowSelfRegistration = command.AllowSelfRegistration;
        settings.MaintenanceModeEnabled = command.MaintenanceModeEnabled;
        settings.PasswordMinLength = command.PasswordMinLength;
        settings.PasswordRequireUppercase = command.PasswordRequireUppercase;
        settings.PasswordRequireLowercase = command.PasswordRequireLowercase;
        settings.PasswordRequireDigit = command.PasswordRequireDigit;
        settings.PasswordRequireSpecialChar = command.PasswordRequireSpecialChar;
        settings.SessionTimeoutMinutes = command.SessionTimeoutMinutes;
        settings.MaxLoginAttempts = command.MaxLoginAttempts;
        settings.LockoutMinutes = command.LockoutMinutes;
        settings.DefaultTrialDurationDays = command.DefaultTrialDurationDays;
        settings.DefaultMaxUsers = command.DefaultMaxUsers;
        settings.DefaultMaxExams = command.DefaultMaxExams;
        settings.DefaultMaxStudents = command.DefaultMaxStudents;
        settings.N8nWebhookUrl = string.IsNullOrWhiteSpace(command.N8nWebhookUrl) ? null : command.N8nWebhookUrl.Trim();
        settings.DefaultInAppNotificationsEnabled = command.DefaultInAppNotificationsEnabled;
        settings.DefaultEmailNotificationsEnabled = command.DefaultEmailNotificationsEnabled;
        settings.UpdatedAtUtc = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        return UpdatePlatformSettingsResult.Ok(settings);
    }
}
