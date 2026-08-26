namespace OnlineExamSystem.Submission.Application.Attempts.RecordFullscreenExit;

public class RecordFullscreenExitResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsNotInProgress { get; init; }
    public int FullscreenExitCount { get; init; }

    public static RecordFullscreenExitResult Ok(int count) => new() { Success = true, FullscreenExitCount = count };

    public static RecordFullscreenExitResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static RecordFullscreenExitResult Forbidden() => new() { IsForbidden = true };

    public static RecordFullscreenExitResult NotInProgress() => new() { IsNotInProgress = true };
}
