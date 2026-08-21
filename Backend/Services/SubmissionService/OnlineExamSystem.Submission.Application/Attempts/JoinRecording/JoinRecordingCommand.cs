namespace OnlineExamSystem.Submission.Application.Attempts.JoinRecording;

public record JoinRecordingCommand(Guid AttemptId, Guid UserId, string BearerToken);
