namespace OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;

public class RecordProctoringViolationResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsNotInProgress { get; init; }
    public int NoFaceDetectedCount { get; init; }
    public int MultipleFacesDetectedCount { get; init; }
    public int TabSwitchCount { get; init; }
    public int MultipleTabsCount { get; init; }
    public int CopyPasteCount { get; init; }
    public int RightClickCount { get; init; }

    public static RecordProctoringViolationResult Ok(Domain.Entities.ExamAttempt attempt) => new()
    {
        Success = true,
        NoFaceDetectedCount = attempt.NoFaceDetectedCount,
        MultipleFacesDetectedCount = attempt.MultipleFacesDetectedCount,
        TabSwitchCount = attempt.TabSwitchCount,
        MultipleTabsCount = attempt.MultipleTabsCount,
        CopyPasteCount = attempt.CopyPasteCount,
        RightClickCount = attempt.RightClickCount,
    };

    public static RecordProctoringViolationResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static RecordProctoringViolationResult Forbidden() => new() { IsForbidden = true };

    public static RecordProctoringViolationResult NotInProgress() => new() { IsNotInProgress = true };
}
