namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record AttemptAnswerResponse(
    Guid Id,
    Guid AttemptId,
    Guid QuestionId,
    Guid? SelectedOptionId,
    bool IsMarkedForReview,
    DateTime AnsweredAtUtc,
    string? AnswerText = null,
    int? MarksAwarded = null,
    Guid? GradedByUserId = null,
    DateTime? GradedAtUtc = null,
    IReadOnlyList<Guid>? SelectedOptionIds = null);
