using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;

public class SaveAnswerResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public bool IsAttemptNotFound { get; init; }
    public bool IsNotInProgress { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsExpired { get; init; }
    // Locked section: this question already has a real saved answer, so it's
    // permanently unreachable for the rest of the section.
    public bool IsQuestionLocked { get; init; }
    // Sequential section: an earlier question in the section (by canonical,
    // unshuffled order) hasn't been answered yet.
    public bool IsOutOfSequence { get; init; }
    public AttemptAnswer? Answer { get; init; }

    public static SaveAnswerResult Ok(AttemptAnswer answer) => new() { Success = true, Answer = answer };

    public static SaveAnswerResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static SaveAnswerResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static SaveAnswerResult NotInProgress() => new() { IsNotInProgress = true };

    public static SaveAnswerResult Forbidden() => new() { IsForbidden = true };

    public static SaveAnswerResult Expired() => new() { IsExpired = true };

    public static SaveAnswerResult QuestionLocked() => new() { IsQuestionLocked = true };

    public static SaveAnswerResult OutOfSequence() => new() { IsOutOfSequence = true };
}
