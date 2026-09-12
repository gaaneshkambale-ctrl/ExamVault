namespace OnlineExamSystem.Submission.Application.Attempts.ListUngradedByExam;

public record ListUngradedAnswersByExamQuery(
    Guid ExamId,
    Guid? OwnerUserId = null,
    string BearerToken = "");
