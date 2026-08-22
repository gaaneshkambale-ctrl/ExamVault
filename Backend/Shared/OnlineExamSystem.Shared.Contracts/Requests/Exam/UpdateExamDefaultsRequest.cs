namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

public record UpdateExamDefaultsRequest(
    int DefaultDurationMinutes,
    int PassingScorePercent,
    int DefaultMaxAttempts,
    bool NegativeMarkingEnabled,
    decimal NegativeMarkingValue,
    bool AutoSaveEnabled,
    bool AutoSubmitEnabled,
    string QuestionNavigationMode,
    string ResultPublishingMode);
