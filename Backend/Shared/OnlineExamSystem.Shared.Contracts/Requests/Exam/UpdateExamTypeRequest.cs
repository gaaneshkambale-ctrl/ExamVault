namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

// See CreateExamTypeRequest's own comment for what the optional fields mean.
public record UpdateExamTypeRequest(
    string Name,
    string? Purpose = null,
    int? DefaultDurationMinutes = null,
    int? PassingScorePercent = null,
    int? DefaultMaxAttempts = null,
    bool? NegativeMarkingEnabled = null,
    decimal? NegativeMarkingValue = null,
    bool? AutoSubmitEnabled = null);
