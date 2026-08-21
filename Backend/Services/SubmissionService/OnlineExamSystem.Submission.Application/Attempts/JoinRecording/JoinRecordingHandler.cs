using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.JoinRecording;

// Live Monitoring's "video recording" feature (Metered.ca) - the student's
// own exam client calls this once its camera is ready, to get a room to
// publish into. Deliberately idempotent: the room name is deterministic
// (attempt-{attemptId}), so a page refresh mid-exam just re-creates/re-joins
// the same room rather than starting a second recording.
//
// Gated on BOTH EnableProctoring and EnableLiveVideo - the latter lets an
// exam keep face-detection/violation-tracking on (that runs entirely
// client-side in useProctoring.ts, unaffected by this handler) while still
// refusing to ever publish the student's camera anywhere.
public class JoinRecordingHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IAssignmentLookupClient _assignmentLookupClient;
    private readonly IVideoRecordingService _videoRecordingService;

    public JoinRecordingHandler(
        ISubmissionRepository repository,
        IAssignmentLookupClient assignmentLookupClient,
        IVideoRecordingService videoRecordingService)
    {
        _repository = repository;
        _assignmentLookupClient = assignmentLookupClient;
        _videoRecordingService = videoRecordingService;
    }

    public async Task<JoinRecordingResult> HandleAsync(
        JoinRecordingCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return JoinRecordingResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return JoinRecordingResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return JoinRecordingResult.NotInProgress();
        }

        var assignment = await _assignmentLookupClient.GetMyAssignmentAsync(
            attempt.ExamId,
            command.BearerToken,
            cancellationToken);
        if (assignment is not { EnableProctoring: true, EnableLiveVideo: true })
        {
            return JoinRecordingResult.Ok(null, null);
        }

        var roomName = $"attempt-{attempt.Id}";
        await _videoRecordingService.EnsureRoomExistsAsync(roomName, cancellationToken);

        // Try minting a token even if EnsureRoomExistsAsync just reported
        // failure - the room may already exist from an earlier join call on
        // the same attempt, and token creation is the real success signal.
        var token = await _videoRecordingService.CreateJoinTokenAsync(roomName, command.UserId, cancellationToken);
        if (token is null)
        {
            return JoinRecordingResult.Ok(null, null);
        }

        return JoinRecordingResult.Ok(_videoRecordingService.GetRoomUrl(roomName), token);
    }
}
