using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamAssignmentTarget : BaseEntity
{
    public Guid ExamAssignmentId { get; set; }
    public Guid UserId { get; set; }
}
