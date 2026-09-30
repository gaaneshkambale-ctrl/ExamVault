namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record CreateAssignmentRequest(
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
    // Admin-only "Assign Anyway" override for a student who doesn't match
    // the exam's academic scope (eg. a backlog/re-examination case) - one
    // shared OverrideReason for the whole request. Ignored server-side for
    // a non-Admin caller regardless of what's sent here.
    bool AllowEligibilityOverride = false,
    string? OverrideReason = null);
