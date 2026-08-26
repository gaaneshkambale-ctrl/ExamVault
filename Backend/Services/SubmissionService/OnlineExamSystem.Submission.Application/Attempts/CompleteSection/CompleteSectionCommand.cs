namespace OnlineExamSystem.Submission.Application.Attempts.CompleteSection;

public record CompleteSectionCommand(Guid AttemptId, Guid SectionId, Guid UserId);
