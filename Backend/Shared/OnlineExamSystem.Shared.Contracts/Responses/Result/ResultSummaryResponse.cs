namespace OnlineExamSystem.Shared.Contracts.Responses.Result;

public record QuestionResultOptionResponse(Guid OptionId, string OptionText, bool IsCorrect);

public record QuestionResultResponse(
    Guid QuestionId,
    string QuestionText,
    int Marks,
    int MarksAwarded,
    Guid? SelectedOptionId,
    bool IsCorrect,
    IReadOnlyList<QuestionResultOptionResponse> Options);

public record ResultSummaryResponse(
    Guid AttemptId,
    Guid ExamId,
    string ExamTitle,
    int TotalScore,
    int TotalMarks,
    int PassingMarks,
    bool Passed,
    DateTime SubmittedAtUtc,
    IReadOnlyList<QuestionResultResponse>? Questions);
