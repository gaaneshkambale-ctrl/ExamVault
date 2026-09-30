using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

/// <summary>One row per tenant controlling which AI proctoring detectors run during exams
/// that have EnableProctoring checked at the assignment level. ProctoringEnabled is a
/// master switch on top of that per-assignment flag. All default to true so the
/// detectors behave the same as the original per-assignment-only design.</summary>
public class ProctoringSettings : TenantScopedEntity
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

    // Security Settings card's one genuinely new field - bundled onto this
    // existing singleton table alongside the toggles it already shares with
    // the Proctoring card, rather than a new table for one field.
    public int SessionTimeoutMinutes { get; set; } = 30;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    // Who last changed these anti-cheat toggles - real accountability for a
    // security-relevant config table, not previously tracked (only the
    // timestamp was). Null until the first real update.
    public Guid? UpdatedByUserId { get; set; }
}
