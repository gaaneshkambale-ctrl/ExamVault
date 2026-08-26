namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record AttemptSectionStateResponse(
    Guid Id,
    Guid AttemptId,
    Guid SectionId,
    DateTime EnteredAtUtc,
    DateTime DeadlineUtc,
    bool IsCompleted,
    DateTime? CompletedAtUtc);
