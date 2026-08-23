namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record UngradedAnswerResponse(
    Guid AttemptId,
    Guid QuestionId,
    Guid UserId,
    string AnswerText,
    DateTime AnsweredAtUtc);
