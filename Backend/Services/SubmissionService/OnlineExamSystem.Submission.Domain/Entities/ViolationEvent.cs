using OnlineExamSystem.Shared.Common.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Domain.Entities;

// One row per actual occurrence (unlike ExamAttempt's *Count fields, which
// only ever hold a running total with no per-occurrence timestamp) - backs
// Live Monitoring's Security Violations feed, which needs a real "when did
// this happen" and a real investigate/resolve workflow.
public class ViolationEvent : BaseEntity
{
    public Guid AttemptId { get; set; }
    public ProctoringViolationType Type { get; set; }
    public ViolationSeverity Severity { get; set; }
    public ViolationStatus Status { get; set; } = ViolationStatus.Open;
    public DateTime DetectedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public Guid? ResolvedByAdminUserId { get; set; }
}
