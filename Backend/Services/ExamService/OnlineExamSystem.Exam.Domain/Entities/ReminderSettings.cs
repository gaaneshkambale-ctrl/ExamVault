using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

/// <summary>One row per tenant controlling which of the two exam-reminder windows
/// ExamReminderCheckService is allowed to fire for that tenant. Both default to true so a
/// fresh database - or a tenant with no row yet - behaves exactly like before this setting
/// existed. The background job has no tenant of its own, so it checks each tenant's row
/// explicitly (GetOrCreateReminderSettingsForTenantAsync) rather than relying on the ambient
/// query filter used everywhere else.</summary>
public class ReminderSettings : TenantScopedEntity
{
    public bool Enable24HourReminder { get; set; } = true;
    public bool Enable1HourReminder { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
