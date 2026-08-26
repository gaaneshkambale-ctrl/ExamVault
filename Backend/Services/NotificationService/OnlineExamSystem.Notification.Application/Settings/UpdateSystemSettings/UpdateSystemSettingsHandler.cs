using FluentValidation;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Settings.UpdateSystemSettings;

public class UpdateSystemSettingsHandler
{
    private readonly ISystemSettingsRepository _repository;
    private readonly IValidator<UpdateSystemSettingsCommand> _validator;

    public UpdateSystemSettingsHandler(ISystemSettingsRepository repository, IValidator<UpdateSystemSettingsCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<UpdateSystemSettingsResult> HandleAsync(
        UpdateSystemSettingsCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateSystemSettingsResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var settings = await _repository.GetOrCreateAsync(cancellationToken);
        settings.MaintenanceModeEnabled = command.MaintenanceModeEnabled;
        settings.BackupFrequency = Enum.Parse<BackupFrequency>(command.BackupFrequency, ignoreCase: true);
        settings.AuditLogRetentionDays = command.AuditLogRetentionDays;
        settings.LogLevel = Enum.Parse<SystemLogLevel>(command.LogLevel, ignoreCase: true);
        settings.UpdatedAtUtc = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        return UpdateSystemSettingsResult.Ok(settings);
    }
}
