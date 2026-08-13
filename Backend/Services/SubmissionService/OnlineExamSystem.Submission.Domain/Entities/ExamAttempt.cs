using OnlineExamSystem.Shared.Common.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Domain.Entities;

public class ExamAttempt : BaseEntity
{
    public Guid ExamId { get; set; }
    public Guid UserId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public AttemptStatus Status { get; set; } = AttemptStatus.InProgress;
}
