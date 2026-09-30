namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ProctoringSettingsResponse(
    bool ProctoringEnabled,
    bool FaceDetectionEnabled,
    bool MultiPersonDetectionEnabled,
    bool ScreenMonitoringEnabled,
    bool FullscreenExitEnabled,
    bool MultipleTabsEnabled,
    bool CopyPasteBlockingEnabled,
    bool RightClickBlockingEnabled,
    bool MultipleMonitorsEnabled,
    int SessionTimeoutMinutes = 30,
    DateTime UpdatedAtUtc = default,
    Guid? UpdatedByUserId = null);
