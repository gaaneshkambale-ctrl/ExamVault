namespace OnlineExamSystem.Submission.Application.Attempts.WatchRecording;

public class WatchRecordingResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsNotInProgress { get; init; }
    // The admin hasn't (or no longer has) live-watch authority granted for
    // this specific attempt - see LiveWatchEnabled on ExamAttempt.
    public bool IsNotAuthorized { get; init; }
    // Both null is a valid, non-error outcome: Metered is unreachable/
    // unconfigured, or the student's own JoinRecording never ran (no
    // proctoring on their assignment, so there's genuinely nothing to
    // watch) - either way the admin UI just shows "nothing to show".
    public string? RoomUrl { get; init; }
    public string? Token { get; init; }

    public static WatchRecordingResult Ok(string? roomUrl, string? token) =>
        new() { Success = true, RoomUrl = roomUrl, Token = token };

    public static WatchRecordingResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static WatchRecordingResult NotInProgress() => new() { IsNotInProgress = true };

    public static WatchRecordingResult NotAuthorized() => new() { IsNotAuthorized = true };
}
