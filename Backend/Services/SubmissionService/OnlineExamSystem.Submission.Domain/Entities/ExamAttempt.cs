using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Domain.Entities;

public class ExamAttempt : TenantScopedEntity
{
    public Guid ExamId { get; set; }
    public Guid UserId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public AttemptStatus Status { get; set; } = AttemptStatus.InProgress;
    public int FullscreenExitCount { get; set; }
    public int NoFaceDetectedCount { get; set; }
    public int MultipleFacesDetectedCount { get; set; }
    public int TabSwitchCount { get; set; }
    public int MultipleTabsCount { get; set; }
    public int CopyPasteCount { get; set; }
    public int RightClickCount { get; set; }
    public int MultipleMonitorsCount { get; set; }
    // Per-session watch authority - off by default even when proctoring is
    // enabled. An admin must explicitly grant it (Proctoring page's "Live"
    // toggle) before WatchRecordingHandler will mint a viewer token; never
    // set anywhere else (not at Start, not from JoinRecording).
    public bool LiveWatchEnabled { get; set; }
}
