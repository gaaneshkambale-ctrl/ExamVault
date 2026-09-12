namespace OnlineExamSystem.Shared.Contracts.Responses.Submission;

// Super Admin platform-wide Submissions browse only - deliberately separate
// from ExamAttemptResponse (used for grading/monitoring one exam) since this
// adds TenantId plus a resolved student name/email, and omits the
// proctoring counters not relevant to a cross-tenant browse list.
// Score/Percentage are deliberately absent - scoring is computed live,
// per-exam, by Result Service, not a stored column this list can page/sort
// on at platform scale.
public record PlatformSubmissionResponse(
    Guid Id,
    Guid ExamId,
    Guid UserId,
    Guid TenantId,
    int AttemptNumber,
    string Status,
    DateTime StartedAtUtc,
    DateTime? SubmittedAtUtc,
    string? StudentName = null,
    string? StudentEmail = null);
