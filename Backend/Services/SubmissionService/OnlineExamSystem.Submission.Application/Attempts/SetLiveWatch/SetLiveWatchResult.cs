namespace OnlineExamSystem.Submission.Application.Attempts.SetLiveWatch;

public class SetLiveWatchResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsNotInProgress { get; init; }
    public bool LiveWatchEnabled { get; init; }

    public static SetLiveWatchResult Ok(bool liveWatchEnabled) =>
        new() { Success = true, LiveWatchEnabled = liveWatchEnabled };

    public static SetLiveWatchResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static SetLiveWatchResult NotInProgress() => new() { IsNotInProgress = true };
}
