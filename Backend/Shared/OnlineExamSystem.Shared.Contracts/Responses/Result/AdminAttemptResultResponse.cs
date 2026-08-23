namespace OnlineExamSystem.Shared.Contracts.Responses.Result;

public record AdminAttemptResultResponse(
    Guid AttemptId,
    Guid UserId,
    Guid ExamId,
    string ExamTitle,
    decimal TotalScore,
    int TotalMarks,
    int PassingMarks,
    bool Passed,
    DateTime SubmittedAtUtc,
    IReadOnlyList<QuestionResultResponse> Questions,
    int FullscreenExitCount,
    int NoFaceDetectedCount,
    int MultipleFacesDetectedCount,
    int TabSwitchCount,
    int MultipleTabsCount,
    int CopyPasteCount,
    int RightClickCount,
    int MultipleMonitorsCount,
    bool HasPendingGrading = false);
