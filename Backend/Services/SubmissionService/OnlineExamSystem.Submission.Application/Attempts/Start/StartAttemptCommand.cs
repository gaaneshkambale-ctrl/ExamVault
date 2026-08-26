namespace OnlineExamSystem.Submission.Application.Attempts.Start;

public record StartAttemptCommand(Guid ExamId, Guid UserId, string BearerToken);
