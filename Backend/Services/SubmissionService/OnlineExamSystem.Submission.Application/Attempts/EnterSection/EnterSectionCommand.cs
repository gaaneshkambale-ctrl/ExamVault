namespace OnlineExamSystem.Submission.Application.Attempts.EnterSection;

public record EnterSectionCommand(Guid AttemptId, Guid SectionId, Guid UserId, string BearerToken);
