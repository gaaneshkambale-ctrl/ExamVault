using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Submission.Domain.Entities;

public class AttemptAnswer : BaseEntity
{
    public Guid AttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? SelectedOptionId { get; set; }
    public bool IsMarkedForReview { get; set; }
    public DateTime AnsweredAtUtc { get; set; }
}
