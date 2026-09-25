using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamAssignmentTarget : TenantScopedEntity
{
    public Guid ExamAssignmentId { get; set; }
    public Guid UserId { get; set; }

    // Set only for a student who didn't match the exam's
    // RestrictToAcademicScope eligibility check but was assigned anyway via
    // an Admin's explicit "Assign Anyway" override (eg. a backlog/re-
    // examination case) - one shared OverrideReason per CreateAssignment
    // request, stamped onto just the targets that actually needed it, not
    // every target in the batch.
    public bool IsEligibilityOverride { get; set; }
    public string? OverrideReason { get; set; }
}
