using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.EnterSection;

public class EnterSectionResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsNotInProgress { get; init; }
    public bool IsSectionNotFound { get; init; }
    public bool IsSectionLocked { get; init; }
    public AttemptSectionState? State { get; init; }

    public static EnterSectionResult Ok(AttemptSectionState state) => new() { Success = true, State = state };

    public static EnterSectionResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static EnterSectionResult Forbidden() => new() { IsForbidden = true };

    public static EnterSectionResult NotInProgress() => new() { IsNotInProgress = true };

    public static EnterSectionResult SectionNotFound() => new() { IsSectionNotFound = true };

    public static EnterSectionResult SectionLocked() => new() { IsSectionLocked = true };
}
