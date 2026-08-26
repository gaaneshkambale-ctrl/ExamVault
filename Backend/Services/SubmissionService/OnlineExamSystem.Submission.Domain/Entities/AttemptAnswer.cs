using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Submission.Domain.Entities;

public class AttemptAnswer : TenantScopedEntity
{
    public Guid AttemptId { get; set; }
    public Guid QuestionId { get; set; }
    public Guid? SelectedOptionId { get; set; }

    // MultiSelect questions only - a JSON array of option-id GUIDs, e.g.
    // ["<guid>","<guid>"]. Null for every other question type, exactly like
    // SelectedOptionId is null for Code/Programming answers. Kept as a raw
    // JSON string on this same row rather than a child table - same
    // precedent as Question Service's QuestionTestCase.ArgumentsJson.
    public string? SelectedOptionIdsJson { get; set; }

    public bool IsMarkedForReview { get; set; }
    public DateTime AnsweredAtUtc { get; set; }

    // Code/Programming questions only - a question is answered via exactly
    // one of SelectedOptionId or AnswerText, never both. Grading fields stay
    // null until an admin manually grades it (there's no code-execution
    // engine to auto-score against); MarksAwarded null means "not graded
    // yet", not "scored zero".
    public string? AnswerText { get; set; }
    public int? MarksAwarded { get; set; }
    public Guid? GradedByUserId { get; set; }
    public DateTime? GradedAtUtc { get; set; }
}
