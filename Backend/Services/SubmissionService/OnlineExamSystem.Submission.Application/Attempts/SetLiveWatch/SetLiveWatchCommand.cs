namespace OnlineExamSystem.Submission.Application.Attempts.SetLiveWatch;

public record SetLiveWatchCommand(Guid AttemptId, bool Enabled);
