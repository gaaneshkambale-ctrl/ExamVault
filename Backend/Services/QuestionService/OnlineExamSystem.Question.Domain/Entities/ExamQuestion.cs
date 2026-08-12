using OnlineExamSystem.Question.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Question.Domain.Entities;

public class ExamQuestion : BaseEntity
{
    public Guid ExamId { get; set; }
    public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    public string QuestionText { get; set; } = string.Empty;
    public int Marks { get; set; }
    public QuestionDifficulty Difficulty { get; set; } = QuestionDifficulty.Medium;
    public bool ShuffleOptions { get; set; }
    public Guid CreatedByUserId { get; set; }
}
