namespace OnlineExamSystem.Exam.Application.ExamTypes.Create;

public record CreateExamTypeCommand(
    string Name,
    string? Purpose,
    int? DefaultDurationMinutes = null,
    int? PassingScorePercent = null,
    int? DefaultMaxAttempts = null,
    bool? NegativeMarkingEnabled = null,
    decimal? NegativeMarkingValue = null,
    bool? AutoSubmitEnabled = null);
