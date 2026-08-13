namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record AttemptAnswerResponse(
    Guid Id,
    Guid AttemptId,
    Guid QuestionId,
    Guid? SelectedOptionId,
    bool IsMarkedForReview,
    DateTime AnsweredAtUtc);
