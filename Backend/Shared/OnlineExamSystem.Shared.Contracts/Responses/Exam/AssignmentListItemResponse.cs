namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record AssignmentListItemResponse(
    Guid Id,
    int AssignmentNumber,
    Guid ExamId,
    string ExamTitle,
    string TargetType,
    Guid? GroupId,
    int TargetCount,
    DateTime StartAtUtc,
    DateTime EndAtUtc,
    DateTime CreatedAtUtc);
