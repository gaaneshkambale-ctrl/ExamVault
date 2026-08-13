namespace OnlineExamSystem.Submission.Application.Attempts.Submit;

public record SubmitAttemptCommand(Guid AttemptId, Guid UserId, bool IsAutoSubmitted);
