namespace OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;

public record ListLiveAttemptsByExamQuery(Guid ExamId, string BearerToken, Guid? OwnerUserId = null);
