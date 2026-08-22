namespace OnlineExamSystem.Notification.Application.Settings.UpdateSystemSettings;

public record UpdateSystemSettingsCommand(
    bool MaintenanceModeEnabled,
    string BackupFrequency,
    int AuditLogRetentionDays,
    string LogLevel);
