using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.Start;

public class StartAttemptResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public bool IsExamNotFound { get; init; }
    public bool IsMaxAttemptsExceeded { get; init; }
    public bool IsOutsideSchedulingWindow { get; init; }
    public ExamAttempt? Attempt { get; init; }

    public static StartAttemptResult Ok(ExamAttempt attempt) => new() { Success = true, Attempt = attempt };

    public static StartAttemptResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static StartAttemptResult ExamNotFound() => new() { IsExamNotFound = true };

    public static StartAttemptResult MaxAttemptsExceeded() => new() { IsMaxAttemptsExceeded = true };

    public static StartAttemptResult OutsideSchedulingWindow() => new() { IsOutsideSchedulingWindow = true };
}
