using OnlineExamSystem.Shared.Events.Base;

namespace OnlineExamSystem.Shared.Events.Exam;

public enum ReminderWindow
{
    TwentyFourHour,
    OneHour,
}

public sealed record ExamReminderDueEvent : IntegrationEvent
{
    public required Guid ExamId { get; init; }
    public required Guid AssignmentId { get; init; }
    public required string ExamTitle { get; init; }
    public required DateTime StartAtUtc { get; init; }
    public required ReminderWindow Window { get; init; }
    public required IReadOnlyList<AssignedUserInfo> Targets { get; init; }
}
