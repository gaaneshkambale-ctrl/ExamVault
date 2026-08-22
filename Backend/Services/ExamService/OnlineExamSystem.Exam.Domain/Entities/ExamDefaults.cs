using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

/// <summary>Single global row of default values shown on the Exam Settings card.
/// Not yet wired into CreateExam's actual prefill values (deferred) - this round
/// only makes the values real and editable in Settings.</summary>
public class ExamDefaults : BaseEntity
{
    public int DefaultDurationMinutes { get; set; } = 60;
    public int PassingScorePercent { get; set; } = 40;
    public int DefaultMaxAttempts { get; set; } = 3;
    public bool NegativeMarkingEnabled { get; set; } = true;
    public decimal NegativeMarkingValue { get; set; } = 0.25m;
    public bool AutoSaveEnabled { get; set; } = true;
    public bool AutoSubmitEnabled { get; set; } = true;
    public QuestionNavigationMode QuestionNavigationMode { get; set; } = QuestionNavigationMode.Free;
    public ResultPublishingMode ResultPublishingMode { get; set; } = ResultPublishingMode.Manual;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
