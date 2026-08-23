using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.Grade;

public class GradeAnswerResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public bool IsNotFound { get; init; }
    public bool IsNotAnswered { get; init; }
    public AttemptAnswer? Answer { get; init; }

    public static GradeAnswerResult Ok(AttemptAnswer answer) => new() { Success = true, Answer = answer };

    public static GradeAnswerResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static GradeAnswerResult NotFound() => new() { IsNotFound = true };

    public static GradeAnswerResult NotAnswered() => new() { IsNotAnswered = true };
}
