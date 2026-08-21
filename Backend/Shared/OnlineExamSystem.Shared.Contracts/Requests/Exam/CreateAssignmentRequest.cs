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
    bool EnableLiveVideo);
