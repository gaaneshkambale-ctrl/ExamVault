namespace OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;

public record ListViolationsByExamQuery(Guid ExamId, string BearerToken, Guid? OwnerUserId = null);
