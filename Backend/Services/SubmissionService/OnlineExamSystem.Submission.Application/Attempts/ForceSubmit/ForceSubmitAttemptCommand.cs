namespace OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;

public record ForceSubmitAttemptCommand(Guid AttemptId, Guid AdminUserId);
