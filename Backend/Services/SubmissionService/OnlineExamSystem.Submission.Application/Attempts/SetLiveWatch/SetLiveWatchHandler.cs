using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.SetLiveWatch;

// Admin-only authority toggle behind the Proctoring page's per-card "Live"
// switch. Deliberately separate from EnableProctoring (an assignment-level
// setting fixed at exam-assignment time) - this is a per-session, real-time
// grant an admin flips during THIS attempt, off by default even when
// proctoring is on. WatchRecordingHandler re-checks the flag it sets here on
// every token request, so this is a genuine authorization gate, not a UI hint.
public class SetLiveWatchHandler
{
    private readonly ISubmissionRepository _repository;

    public SetLiveWatchHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<SetLiveWatchResult> HandleAsync(
        SetLiveWatchCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return SetLiveWatchResult.AttemptNotFound();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return SetLiveWatchResult.NotInProgress();
        }

        attempt.LiveWatchEnabled = command.Enabled;
        await _repository.SaveChangesAsync(cancellationToken);

        return SetLiveWatchResult.Ok(attempt.LiveWatchEnabled);
    }
}
