namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record SystemSettingsResponse(
    bool MaintenanceModeEnabled,
    string BackupFrequency,
    int AuditLogRetentionDays,
    string LogLevel,
    string Environment,
    DateTime UpdatedAtUtc);
