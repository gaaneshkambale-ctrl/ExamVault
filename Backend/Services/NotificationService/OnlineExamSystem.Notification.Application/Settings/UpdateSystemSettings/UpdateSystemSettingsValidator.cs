using FluentValidation;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Settings.UpdateSystemSettings;

public class UpdateSystemSettingsValidator : AbstractValidator<UpdateSystemSettingsCommand>
{
    public UpdateSystemSettingsValidator()
    {
        RuleFor(x => x.BackupFrequency).IsEnumName(typeof(BackupFrequency), caseSensitive: false);
        RuleFor(x => x.LogLevel).IsEnumName(typeof(SystemLogLevel), caseSensitive: false);
        RuleFor(x => x.AuditLogRetentionDays).GreaterThanOrEqualTo(1).LessThanOrEqualTo(3650);
    }
}
