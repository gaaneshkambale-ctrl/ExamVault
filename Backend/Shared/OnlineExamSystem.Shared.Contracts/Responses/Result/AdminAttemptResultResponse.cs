namespace OnlineExamSystem.Shared.Contracts.Responses.Result;

public record AdminAttemptResultResponse(
    Guid AttemptId,
    Guid UserId,
    Guid ExamId,
    string ExamTitle,
    int TotalScore,
    int TotalMarks,
    int PassingMarks,
    bool Passed,
    DateTime SubmittedAtUtc,
    IReadOnlyList<QuestionResultResponse> Questions,
    int FullscreenExitCount);
