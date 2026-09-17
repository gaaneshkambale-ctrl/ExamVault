using OnlineExamSystem.Exam.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Domain.Entities;

public class ExamPaper : TenantScopedEntity
{
    public string Title { get; set; } = string.Empty;
    public string? ExamCode { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;

    // Genuinely free-text (unlike Category, which is UI-constrained to
    // EXAM_CATEGORIES) - comma-separated, single string column rather than
    // a normalized many-to-many table, matching this codebase's own stated
    // intent for Tags ("a simple string field... matching how Category is
    // handled" per ActionPlan.txt) rather than building a full tagging system.
    public string Tags { get; set; } = string.Empty;
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

    // Per-exam certificate gate (Edit Exam's "Certificate Generation" card) -
    // seeded from the tenant's ExamDefaults at creation (same pattern as
    // NegativeMarkingEnabled/NegativeMarks above), then editable per exam.
    // A student only ever sees/downloads a certificate for THIS exam when
    // CertificateEnabled is true AND their score % is >=
    // MinimumCertificateScorePercent (see certificateId.ts's
    // isCertificateEligible) - replaces the previous fixed, non-configurable
    // 80% threshold and Exam-Type-based on/off flag.
    public bool CertificateEnabled { get; set; }
    public int MinimumCertificateScorePercent { get; set; } = 80;

    // Organization-type-specific exam fields captured at Create/Edit Exam
    // time - eg. a College's Semester, a Coaching Institute's Test Series.
    // JSON-serialized Dictionary<string,string>, same flexible-schema
    // approach as AppUser.AcademicFieldsJson and
    // OrganizationAcademicConfig.AcademicFieldsJson in UserService: which
    // fields matter varies entirely by the tenant's Organization Type, so
    // this deliberately isn't a fixed set of new columns.
    public string? AcademicFieldsJson { get; set; }

    // When true, CreateAssignmentHandler rejects (or requires an Admin
    // override for) a target student whose own AcademicFieldsJson doesn't
    // match this exam's program/department/semester/division values.
    // Defaults true so every already-existing College/University exam
    // (Program/Department/Semester have been mandatory there since before
    // this flag existed) starts enforcing eligibility with no backfill
    // migration needed - the check itself only ever compares whichever
    // keys THIS exam's own AcademicFieldsJson actually has, so it's a
    // harmless no-op for org types (School, Coaching, etc.) whose exam
    // fields don't include those keys at all.
    public bool RestrictToAcademicScope { get; set; } = true;
}
