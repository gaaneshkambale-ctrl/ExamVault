using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.CompleteSection;

public class CompleteSectionResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsNotInProgress { get; init; }
    public AttemptSectionState? State { get; init; }

    public static CompleteSectionResult Ok(AttemptSectionState state) => new() { Success = true, State = state };

    public static CompleteSectionResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static CompleteSectionResult Forbidden() => new() { IsForbidden = true };

    public static CompleteSectionResult NotInProgress() => new() { IsNotInProgress = true };
}
