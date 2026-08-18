using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

/// <summary>Single global row controlling which AI proctoring detectors run during exams
/// that have EnableProctoring checked at the assignment level. ProctoringEnabled is a
/// master switch on top of that per-assignment flag. All default to true so the
/// detectors behave the same as the original per-assignment-only design.</summary>
public class ProctoringSettings : BaseEntity
{
    public bool ProctoringEnabled { get; set; } = true;
    public bool FaceDetectionEnabled { get; set; } = true;
    public bool MultiPersonDetectionEnabled { get; set; } = true;
    public bool ScreenMonitoringEnabled { get; set; } = true;
    public bool FullscreenExitEnabled { get; set; } = true;
    public bool MultipleTabsEnabled { get; set; } = true;
    public bool CopyPasteBlockingEnabled { get; set; } = true;
    public bool RightClickBlockingEnabled { get; set; } = true;
    public bool MultipleMonitorsEnabled { get; set; } = true;
}
