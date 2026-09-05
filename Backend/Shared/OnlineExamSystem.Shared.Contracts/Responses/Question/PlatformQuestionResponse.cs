namespace OnlineExamSystem.Shared.Contracts.Responses.Question;

// Super Admin platform-wide Question Bank browse only - deliberately
// separate from QuestionResponse (used while taking/grading one exam,
// with student-vs-admin answer masking) rather than adding TenantId to
// that shared DTO. No ExamTitle field - QuestionService has no Exams
// table of its own; the frontend joins ExamId against the platform's
// already-fetched cross-tenant exam list instead.
public record PlatformQuestionResponse(
    Guid Id,
    Guid ExamId,
    Guid? SectionId,
    Guid TenantId,
    string QuestionType,
    string QuestionText,
    int Marks,
    string Difficulty,
    DateTime CreatedAtUtc,
    Guid CreatedByUserId = default,
    string? CreatedByName = null);
