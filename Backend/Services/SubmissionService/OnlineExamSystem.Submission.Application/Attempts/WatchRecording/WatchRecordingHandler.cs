using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.WatchRecording;

// Admin's side of the Metered.ca room the student's own JoinRecordingHandler
// already publishes into (same deterministic "attempt-{id}" room name). Gated
// on ExamAttempt.LiveWatchEnabled - an admin must have explicitly granted
// watch authority for THIS attempt (Proctoring page's "Live" toggle,
// SetLiveWatchHandler) before a token is ever minted; Admin role alone is not
// enough, by design.
public class WatchRecordingHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IVideoRecordingService _videoRecordingService;

    public WatchRecordingHandler(ISubmissionRepository repository, IVideoRecordingService videoRecordingService)
    {
        _repository = repository;
        _videoRecordingService = videoRecordingService;
    }

    public async Task<WatchRecordingResult> HandleAsync(
        WatchRecordingCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return WatchRecordingResult.AttemptNotFound();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return WatchRecordingResult.NotInProgress();
        }

        if (!attempt.LiveWatchEnabled)
        {
            return WatchRecordingResult.NotAuthorized();
        }

        var roomName = $"attempt-{attempt.Id}";
        await _videoRecordingService.EnsureRoomExistsAsync(roomName, cancellationToken);

        // Same "try the token anyway" reasoning as JoinRecordingHandler - the
        // room may already exist from the student's own join, so a reported
        // EnsureRoomExists failure doesn't necessarily mean the room is gone.
        var token = await _videoRecordingService.CreateJoinTokenAsync(roomName, command.AdminUserId, cancellationToken);
        if (token is null)
        {
            return WatchRecordingResult.Ok(null, null);
        }

        return WatchRecordingResult.Ok(_videoRecordingService.GetRoomUrl(roomName), token);
    }
}
