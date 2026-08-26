using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;

public class ForceSubmitAttemptResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsAlreadySubmitted { get; init; }
    public ExamAttempt? Attempt { get; init; }

    public static ForceSubmitAttemptResult Ok(ExamAttempt attempt) => new() { Success = true, Attempt = attempt };

    public static ForceSubmitAttemptResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static ForceSubmitAttemptResult AlreadySubmitted() => new() { IsAlreadySubmitted = true };
}
