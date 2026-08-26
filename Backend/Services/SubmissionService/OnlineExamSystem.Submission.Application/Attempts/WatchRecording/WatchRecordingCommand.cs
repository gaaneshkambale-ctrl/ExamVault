namespace OnlineExamSystem.Submission.Application.Attempts.WatchRecording;

public record WatchRecordingCommand(Guid AttemptId, Guid AdminUserId);
