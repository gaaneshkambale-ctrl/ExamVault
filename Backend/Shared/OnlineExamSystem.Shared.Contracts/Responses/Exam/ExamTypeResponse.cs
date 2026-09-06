namespace OnlineExamSystem.Shared.Contracts.Responses.Exam;

public record ExamTypeResponse(
    Guid Id,
    string Name,
    string? Purpose,
    DateTime CreatedAtUtc,
    int? DefaultDurationMinutes = null,
    int? PassingScorePercent = null,
    int? DefaultMaxAttempts = null,
    bool? NegativeMarkingEnabled = null,
    decimal? NegativeMarkingValue = null,
    bool? AutoSubmitEnabled = null);
