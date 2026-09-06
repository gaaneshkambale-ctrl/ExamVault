using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Exam.Domain.Entities;

// Dynamic, admin-manageable exam-purpose classification (Practice/Mock/
// Certification/etc.) - distinct from CreationMethod (how the exam was
// authored: Manual vs AiGenerated) and from Category (free-text subject tag).
//
// The six Default* fields below mirror ExamDefaults' own fields exactly, but
// are all nullable: null means "inherit the tenant's global ExamDefaults",
// only a non-null value overrides it for exams created with this type. See
// CreateExamHandler for where the two get merged. Kept as plain columns on
// ExamType (not a separate table) since this is a 1:1, always-present-or-null
// relationship, not a collection.
public class ExamType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public int? DefaultDurationMinutes { get; set; }
    public int? PassingScorePercent { get; set; }
    public int? DefaultMaxAttempts { get; set; }
    public bool? NegativeMarkingEnabled { get; set; }
    public decimal? NegativeMarkingValue { get; set; }
    public bool? AutoSubmitEnabled { get; set; }
}
