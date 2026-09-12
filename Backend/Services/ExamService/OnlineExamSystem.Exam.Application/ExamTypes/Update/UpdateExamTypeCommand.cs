namespace OnlineExamSystem.Exam.Application.ExamTypes.Update;

public record UpdateExamTypeCommand(
    Guid ExamTypeId,
    string Name,
    string? Purpose,
    int? DefaultDurationMinutes = null,
    int? PassingScorePercent = null,
    int? DefaultMaxAttempts = null,
    bool? NegativeMarkingEnabled = null,
    decimal? NegativeMarkingValue = null,
    bool? AutoSubmitEnabled = null);
