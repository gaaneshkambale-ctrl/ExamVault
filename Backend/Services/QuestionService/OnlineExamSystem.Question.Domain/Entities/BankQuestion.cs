using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Domain.Entities;

// A reusable question that lives in the organization's bank, independent of
// any exam. Adding it to an exam COPIES it into an ExamQuestion (later
// step), so editing a bank question never changes an exam that already used
// it. Code/Programming questions are not bankable yet.
public class BankQuestion : TenantScopedEntity
{
    public Guid SubjectId { get; set; }
    public Guid? TopicId { get; set; }
    public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    public string QuestionText { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Medium;
    public int DefaultMarks { get; set; }
    public decimal NegativeMarks { get; set; }
    public bool ShuffleOptions { get; set; }
    public BankQuestionStatus Status { get; set; } = BankQuestionStatus.Draft;

    // Only for QuestionType.CodeProgram: language, starter/sample code,
    // signature and test cases as one JSON document (see BankCodeSpec in the
    // Application layer). Null for every other type.
    public string? CodeSpecJson { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
