namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record MyAssignmentResponse(
    Guid Id,
    Guid ExamId,
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
    bool EnableProctoring);
