namespace OnlineExamSystem.Shared.Contracts.Responses.Result;

public record QuestionResultOptionResponse(Guid OptionId, string OptionText, bool IsCorrect);

public record QuestionResultResponse(
    Guid QuestionId,
    string QuestionText,
    int Marks,
    decimal MarksAwarded,
    Guid? SelectedOptionId,
    bool IsCorrect,
    IReadOnlyList<QuestionResultOptionResponse> Options,
    string QuestionType = "MultipleChoice",
    string? AnswerText = null,
    bool IsPendingGrading = false,
    IReadOnlyList<Guid>? SelectedOptionIds = null);

public record ResultSummaryResponse(
    Guid AttemptId,
    Guid ExamId,
    string ExamTitle,
    decimal TotalScore,
    int TotalMarks,
    int PassingMarks,
    bool Passed,
    DateTime SubmittedAtUtc,
    IReadOnlyList<QuestionResultResponse>? Questions,
    bool HasPendingGrading = false);
