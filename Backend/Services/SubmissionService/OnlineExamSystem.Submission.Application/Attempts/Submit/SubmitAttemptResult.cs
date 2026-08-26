using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.Submit;

public class SubmitAttemptResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public bool IsAttemptNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsAlreadySubmitted { get; init; }
    public ExamAttempt? Attempt { get; init; }

    public static SubmitAttemptResult Ok(ExamAttempt attempt) => new() { Success = true, Attempt = attempt };

    public static SubmitAttemptResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static SubmitAttemptResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static SubmitAttemptResult Forbidden() => new() { IsForbidden = true };

    public static SubmitAttemptResult AlreadySubmitted() => new() { IsAlreadySubmitted = true };
}
