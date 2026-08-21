namespace OnlineExamSystem.Submission.Application.Attempts.JoinRecording;

public class JoinRecordingResult
{
    public bool Success { get; init; }
    public bool IsAttemptNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public bool IsNotInProgress { get; init; }
    // Both null is a valid, non-error outcome: proctoring isn't enabled for
    // this student's assignment, or Metered is unreachable/unconfigured -
    // either way the exam continues, just unrecorded.
    public string? RoomUrl { get; init; }
    public string? Token { get; init; }

    public static JoinRecordingResult Ok(string? roomUrl, string? token) =>
        new() { Success = true, RoomUrl = roomUrl, Token = token };

    public static JoinRecordingResult AttemptNotFound() => new() { IsAttemptNotFound = true };

    public static JoinRecordingResult Forbidden() => new() { IsForbidden = true };

    public static JoinRecordingResult NotInProgress() => new() { IsNotInProgress = true };
}
