namespace OnlineExamSystem.Shared.Contracts.Requests.Exam;

// The six Default*/PassingScorePercent/NegativeMarking* fields are optional
// per-type overrides of the tenant's global Exam Defaults - null/omitted
// means "inherit the tenant default" (see ExamType.cs's own doc comment).
public record CreateExamTypeRequest(
    string Name,
    string? Purpose = null,
    int? DefaultDurationMinutes = null,
    int? PassingScorePercent = null,
    int? DefaultMaxAttempts = null,
    bool? NegativeMarkingEnabled = null,
    decimal? NegativeMarkingValue = null,
    bool? AutoSubmitEnabled = null);
