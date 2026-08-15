namespace OnlineExamSystem.Exam.Application.Assignments;

public record UpcomingAssignmentForReminder(
    Guid AssignmentId,
    Guid ExamId,
    string ExamTitle,
    DateTime StartAtUtc,
    IReadOnlyList<Guid> TargetUserIds);
