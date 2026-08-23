using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamPaper : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? ExamCode { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool ContainsSections { get; set; }
    public CreationMethod CreationMethod { get; set; } = CreationMethod.Manual;
    public Guid? ExamTypeId { get; set; }
    public ExamType? ExamType { get; set; }
    public int DurationMinutes { get; set; }
    public int TotalMarks { get; set; }
    public int PassingMarks { get; set; }
    public string Instructions { get; set; } = string.Empty;
    public ExamStatus Status { get; set; } = ExamStatus.Draft;
    public int TotalQuestions { get; set; }
    public Guid CreatedByUserId { get; set; }

    public bool ShuffleQuestions { get; set; } = true;
    public bool ShuffleOptions { get; set; } = true;
    public bool ShowResult { get; set; } = true;
    public bool ShowCorrectAnswers { get; set; }
    public bool AllowReview { get; set; } = true;
    public DateTime? StartAtUtc { get; set; }
    public DateTime? EndAtUtc { get; set; }
    public int MaxAttempts { get; set; } = 1;
    public bool NegativeMarkingEnabled { get; set; }
    public decimal NegativeMarks { get; set; }

    // Exam Configuration (wireframe screen 10). AllowCalculator/AllowNotes/
    // ShowSectionSummaryToStudents/AutoSubmitOnTimeEnd are stored preferences with
    // no consumer yet (no calculator/notes widget, no section-summary screen exists in
    // Take Exam, and turning AutoSubmitOnTimeEnd off doesn't disable the existing
    // Day-33 auto-submit timer) - flagged here rather than silently built or dropped,
    // per the Exam Sections Milestone scope note in ActionPlan.txt. ConfirmBeforeSubmit
    // is the one that's actually wired into Take Exam's Submit button.
    public bool ShowSectionSummaryToStudents { get; set; } = true;
    public bool AllowCalculator { get; set; }
    public bool AllowNotes { get; set; }
    public bool AutoSubmitOnTimeEnd { get; set; } = true;
    public bool ConfirmBeforeSubmit { get; set; } = true;
}
