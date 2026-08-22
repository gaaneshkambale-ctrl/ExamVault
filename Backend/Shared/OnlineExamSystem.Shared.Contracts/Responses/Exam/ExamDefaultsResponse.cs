namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ExamDefaultsResponse(
    int DefaultDurationMinutes,
    int PassingScorePercent,
    int DefaultMaxAttempts,
    bool NegativeMarkingEnabled,
    decimal NegativeMarkingValue,
    bool AutoSaveEnabled,
    bool AutoSubmitEnabled,
    string QuestionNavigationMode,
    string ResultPublishingMode,
    DateTime UpdatedAtUtc);
