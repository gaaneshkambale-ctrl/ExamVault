using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamReminderLog : BaseEntity
{
    public Guid AssignmentId { get; set; }
    public Guid UserId { get; set; }
    public ReminderWindow Window { get; set; }
}
