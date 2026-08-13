namespace OnlineExamSystem.Shared.Contracts.Responses.Result;

public record ResultSummaryResponse(
    Guid AttemptId,
    Guid ExamId,
    string ExamTitle,
    int TotalScore,
    int TotalMarks,
    int PassingMarks,
    bool Passed,
    DateTime SubmittedAtUtc);
