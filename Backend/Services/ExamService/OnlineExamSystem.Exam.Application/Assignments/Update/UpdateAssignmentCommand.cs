namespace OnlineExamSystem.Exam.Application.Assignments.Update;

public record UpdateAssignmentCommand(
    Guid AssignmentId,
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
    // Instructor is restricted to assignments on exams they created
    // themselves; Admin/SuperAdmin remain unrestricted (null = no
    // ownership check).
    Guid? OwnerUserId = null);
