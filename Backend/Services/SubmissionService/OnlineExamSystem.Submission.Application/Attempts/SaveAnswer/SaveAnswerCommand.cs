namespace OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;

public record SaveAnswerCommand(
    Guid AttemptId,
    Guid QuestionId,
    Guid? SelectedOptionId,
    bool IsMarkedForReview,
    Guid UserId,
    string? AnswerText = null,
    IReadOnlyList<Guid>? SelectedOptionIds = null);
