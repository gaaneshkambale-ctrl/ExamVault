using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Submission.Domain.Entities;

public class AttemptSectionState : TenantScopedEntity
{
    public Guid AttemptId { get; set; }
    public Guid SectionId { get; set; }
    public DateTime EnteredAtUtc { get; set; }
    public DateTime DeadlineUtc { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}
