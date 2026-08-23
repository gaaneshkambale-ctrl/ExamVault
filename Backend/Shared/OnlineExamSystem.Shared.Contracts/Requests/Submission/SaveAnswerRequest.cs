namespace OnlineExamSystem.Shared.Contracts.Requests.Submission;

public record SaveAnswerRequest(
    Guid QuestionId,
    Guid? SelectedOptionId,
    bool IsMarkedForReview,
    string? AnswerText = null,
    IReadOnlyList<Guid>? SelectedOptionIds = null);
