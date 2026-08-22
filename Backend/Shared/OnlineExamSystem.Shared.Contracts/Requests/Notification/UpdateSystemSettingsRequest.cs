namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

public record UpdateSystemSettingsRequest(
    bool MaintenanceModeEnabled,
    string BackupFrequency,
    int AuditLogRetentionDays,
    string LogLevel);
