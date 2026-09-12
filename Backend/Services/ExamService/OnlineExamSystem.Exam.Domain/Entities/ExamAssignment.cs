using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamAssignment : TenantScopedEntity
{
    public int AssignmentNumber { get; set; }
    public Guid ExamId { get; set; }
    public AssignmentTargetType TargetType { get; set; }
    public Guid? GroupId { get; set; }

    // The Admin who scheduled this sitting - real accountability for a
    // security-relevant action (controls proctoring/live-video on
    // potentially many students' attempts), not previously tracked at all.
    public Guid CreatedByUserId { get; set; }

    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public string TimeZoneId { get; set; } = "UTC";
    public int MaxAttempts { get; set; } = 1;
    public bool AllowLateJoin { get; set; }
    public int GraceTimeMinutes { get; set; }

    public bool ShowInstructions { get; set; } = true;
    public bool ShowResultsAfterSubmit { get; set; }
    public bool ShowCorrectAnswers { get; set; }
    public bool AllowReviewAfterSubmit { get; set; }
    public bool AutoSubmitOnTimeOver { get; set; } = true;
    public bool EnableProctoring { get; set; }
    // Independent of EnableProctoring: face-detection/violation-tracking
    // (useProctoring.ts's own camera effect) runs regardless of this flag.
    // This one gates only whether the student's camera ever gets published
    // to Metered at all - JoinRecordingHandler in SubmissionService checks
    // it before creating a room, so it's meaningless without proctoring on.
    public bool EnableLiveVideo { get; set; }

    // Cancelling a scheduled sitting is distinct from deleting it (Delete
    // hard-removes the row and cascades its targets - cancel keeps the
    // record so the Exam Scheduled list can still show it happened).
    // Non-null = cancelled.
    public DateTime? CancelledAtUtc { get; set; }
}
