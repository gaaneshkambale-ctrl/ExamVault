namespace OnlineExamSystem.Exam.Application.Proctoring.UpdateProctoringSettings;

public record UpdateProctoringSettingsCommand(
    bool ProctoringEnabled,
    bool FaceDetectionEnabled,
    bool MultiPersonDetectionEnabled,
    bool ScreenMonitoringEnabled,
    bool FullscreenExitEnabled,
    bool MultipleTabsEnabled,
    bool CopyPasteBlockingEnabled,
    bool RightClickBlockingEnabled);
