namespace OnlineExamSystem.Exam.Application.Assignments.Create;

public record CreateAssignmentCommand(
    Guid ExamId,
    string TargetType,
    IReadOnlyList<Guid>? UserIds,
    Guid? GroupId,
    DateTime StartAtUtc,
    DateTime EndAtUtc,
    string TimeZoneId,
    int MaxAttempts,
    bool AllowLateJoin,
    int GraceTimeMinutes,
    bool ShowInstructions,
    bool ShowResultsAfterSubmit,
    bool ShowCorrectAnswers,
    bool AllowReviewAfterSubmit,
    bool AutoSubmitOnTimeOver,
    bool EnableProctoring,
    bool EnableLiveVideo,
    string BearerToken,
    Guid CreatedByUserId,
    // Instructor is restricted to exams they created themselves, same
    // ownership rule ExamsController's Update/Delete/ChangeStatus already
    // enforce; Admin/SuperAdmin remain unrestricted (null = no ownership
    // check). Distinct from CreatedByUserId above (always set, records
    // provenance) even though they're the same value for an Instructor
    // caller.
    Guid? OwnerUserId = null);
