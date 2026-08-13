namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record ExamAttemptResponse(
    Guid Id,
    Guid ExamId,
    Guid UserId,
    int AttemptNumber,
    string Status,
    DateTime StartedAtUtc,
    DateTime? SubmittedAtUtc);
