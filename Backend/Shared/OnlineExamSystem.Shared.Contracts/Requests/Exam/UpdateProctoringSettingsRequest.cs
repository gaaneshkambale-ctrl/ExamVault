namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record UpdateProctoringSettingsRequest(
    bool ProctoringEnabled,
    bool FaceDetectionEnabled,
    bool MultiPersonDetectionEnabled,
    bool ScreenMonitoringEnabled,
    bool FullscreenExitEnabled,
    bool MultipleTabsEnabled,
    bool CopyPasteBlockingEnabled,
    bool RightClickBlockingEnabled);
