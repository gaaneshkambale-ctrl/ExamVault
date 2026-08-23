namespace OnlineExamSystem.Submission.Application.Attempts.ListUngradedByExam;

public record UngradedAnswer(
    Guid AttemptId,
    Guid QuestionId,
    Guid UserId,
    string AnswerText,
    DateTime AnsweredAtUtc);
