using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.Domain.Entities;

/// <summary>One row per tenant backing the System Settings card. MaintenanceModeEnabled
/// and LogLevel are real persisted values but don't yet change actual runtime behavior
/// (traffic blocking / logger level) - that needs separate infra work, deferred. Backup
/// is a policy value only - nothing here ever triggers a real backup.</summary>
public class SystemSettings : TenantScopedEntity
{
    public bool MaintenanceModeEnabled { get; set; }
    public BackupFrequency BackupFrequency { get; set; } = BackupFrequency.Daily;
    public int AuditLogRetentionDays { get; set; } = 180;
    public SystemLogLevel LogLevel { get; set; } = SystemLogLevel.Information;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
