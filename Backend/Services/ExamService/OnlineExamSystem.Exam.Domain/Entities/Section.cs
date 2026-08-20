using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class Section : BaseEntity
{
    public Guid ExamId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    // Admin-entered targets, not auto-synced to however many questions actually get
    // assigned - same precedent as ExamPaper.TotalQuestions since Day 19.
    public int QuestionCount { get; set; }
    public int Marks { get; set; }
    public int DurationMinutes { get; set; }

    public NavigationType NavigationType { get; set; } = NavigationType.Free;
    public bool NegativeMarkingEnabled { get; set; }
    public decimal NegativeMarks { get; set; }
    public bool ShuffleQuestions { get; set; } = true;
    public bool ShuffleOptions { get; set; } = true;
    public bool AllowReview { get; set; } = true;
}
