namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

public record ExamAttemptResponse(
    Guid Id,
    Guid ExamId,
    Guid UserId,
    int AttemptNumber,
    string Status,
    DateTime StartedAtUtc,
    DateTime? SubmittedAtUtc,
    int FullscreenExitCount,
    int NoFaceDetectedCount,
    int MultipleFacesDetectedCount,
    int TabSwitchCount,
    int MultipleTabsCount,
    int CopyPasteCount,
    int RightClickCount);
