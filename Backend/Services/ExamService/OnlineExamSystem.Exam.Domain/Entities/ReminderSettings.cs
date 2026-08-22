using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

/// <summary>Single global row controlling which of the two exam-reminder windows
/// ExamReminderCheckService is allowed to fire. Both default to true so a fresh
/// database - or one with no row yet - behaves exactly like before this setting
/// existed.</summary>
public class ReminderSettings : BaseEntity
{
    public bool Enable24HourReminder { get; set; } = true;
    public bool Enable1HourReminder { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
