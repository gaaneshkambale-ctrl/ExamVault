using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamReminderLog : TenantScopedEntity
{
    public Guid AssignmentId { get; set; }
    public Guid UserId { get; set; }
    public ReminderWindow Window { get; set; }
}
