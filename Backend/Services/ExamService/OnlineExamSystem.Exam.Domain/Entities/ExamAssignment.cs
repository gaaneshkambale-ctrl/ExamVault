using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamAssignment : BaseEntity
{
    public int AssignmentNumber { get; set; }
    public Guid ExamId { get; set; }
    public AssignmentTargetType TargetType { get; set; }
    public Guid? GroupId { get; set; }

    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public string TimeZoneId { get; set; } = "UTC";
    public int MaxAttempts { get; set; } = 1;
    public bool AllowLateJoin { get; set; }
    public int GraceTimeMinutes { get; set; }

    public bool ShowInstructions { get; set; } = true;
    public bool ShowResultsAfterSubmit { get; set; }
    public bool ShowCorrectAnswers { get; set; }
    public bool AllowReviewAfterSubmit { get; set; }
    public bool AutoSubmitOnTimeOver { get; set; } = true;
    public bool EnableProctoring { get; set; }
}
