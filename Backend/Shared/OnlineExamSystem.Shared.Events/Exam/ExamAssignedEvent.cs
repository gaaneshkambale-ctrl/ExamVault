using OnlineExamSystem.Shared.Events.Base;

namespace OnlineExamSystem.Shared.Events.Exam;

public sealed record AssignedUserInfo
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
    public required string FullName { get; init; }
}

public sealed record ExamAssignedEvent : IntegrationEvent
{
    public required Guid ExamId { get; init; }
    public required string ExamTitle { get; init; }
    public required IReadOnlyList<AssignedUserInfo> Targets { get; init; }
    public required DateTime AssignedAtUtc { get; init; }
}
