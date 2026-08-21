namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record ViolationEventResponse(
    Guid Id,
    Guid AttemptId,
    Guid ExamId,
    Guid UserId,
    string Type,
    string Severity,
    string Status,
    DateTime DetectedAtUtc,
    DateTime? ResolvedAtUtc);
