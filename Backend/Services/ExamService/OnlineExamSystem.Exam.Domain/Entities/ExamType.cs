using OnlineExamSystem.Shared.Common.Multitenancy;

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
//
// TenantScopedEntity (not bare BaseEntity): each org manages its own exam
// types. Previously inherited plain BaseEntity with no TenantId at all - a
// real cross-tenant leak (every tenant saw and shared the same global rows)
// fixed alongside adding Code/IsActive below - see the migration that added
// TenantId here for the one-time backfill note.
public class ExamType : TenantScopedEntity
{
    public string Name { get; set; } = string.Empty;
    // Short, auto-generated, immutable display code (e.g. "ASS-01") shown
    // next to the name in the admin list - never user-editable, see
    // ExamTypeCodeGenerator.
    public string Code { get; set; } = string.Empty;
    // Inactive types are hidden from the exam-type picker when creating a
    // new exam, but stay attached to (and fully readable on) any exam that
    // already used them - see CreateExam's/EditExam's own filtering.
    public bool IsActive { get; set; } = true;
    public string? Purpose { get; set; }
    public int? DefaultDurationMinutes { get; set; }
    public int? PassingScorePercent { get; set; }
    public int? DefaultMaxAttempts { get; set; }
    public bool? NegativeMarkingEnabled { get; set; }
    public decimal? NegativeMarkingValue { get; set; }
    public bool? AutoSubmitEnabled { get; set; }
}
