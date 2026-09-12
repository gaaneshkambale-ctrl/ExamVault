namespace OnlineExamSystem.Exam.Application.Exams.Update;

public record UpdateExamCommand(
    Guid ExamId,
    string Title,
    string Description,
    string CreationMethod,
    int DurationMinutes,
    int TotalMarks,
    int PassingMarks,
    string Instructions,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    bool ShowResult,
    bool ShowCorrectAnswers,
    bool AllowReview,
    DateTime? StartAtUtc,
    DateTime? EndAtUtc,
    int MaxAttempts,
    bool NegativeMarkingEnabled,
    decimal NegativeMarks,
    bool ShowSectionSummaryToStudents,
    bool AllowCalculator,
    bool AllowNotes,
    bool AutoSubmitOnTimeEnd,
    bool ConfirmBeforeSubmit,
    string? ExamCode = null,
    Guid? ExamTypeId = null,
    // Non-null only for an Instructor caller - Admin/SuperAdmin pass null
    // for unrestricted tenant-wide access. When set, the handler requires
    // exam.CreatedByUserId to match, matching the ownership scope List/
    // GetById already enforce for Instructor.
    Guid? OwnerUserId = null);
