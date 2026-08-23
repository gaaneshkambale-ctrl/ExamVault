using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamAssignmentTarget : TenantScopedEntity
{
    public Guid ExamAssignmentId { get; set; }
    public Guid UserId { get; set; }
}
