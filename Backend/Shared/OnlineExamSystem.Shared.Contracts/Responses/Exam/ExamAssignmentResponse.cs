namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ExamAssignmentResponse(
    Guid Id,
    int AssignmentNumber,
    Guid ExamId,
    string TargetType,
    Guid? GroupId,
    IReadOnlyList<Guid> TargetUserIds,
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
    DateTime CreatedAtUtc);
