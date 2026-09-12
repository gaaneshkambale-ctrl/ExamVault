using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.RecordFullscreenExit;

public class RecordFullscreenExitHandler
{
    private readonly ISubmissionRepository _repository;

    public RecordFullscreenExitHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<RecordFullscreenExitResult> HandleAsync(
        RecordFullscreenExitCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return RecordFullscreenExitResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return RecordFullscreenExitResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return RecordFullscreenExitResult.NotInProgress();
        }

        attempt.FullscreenExitCount++;

        // Also persisted as a ViolationEvent (same as every other proctoring
        // signal) so it shows up in Live Monitoring's Security Violations
        // feed instead of only existing as a running count on the attempt.
        await _repository.AddViolationEventAsync(
            new ViolationEvent
            {
                AttemptId = attempt.Id,
                Type = ProctoringViolationType.FullscreenExit,
                Severity = ViolationSeverity.Medium,
                DetectedAtUtc = DateTime.UtcNow,
            },
            cancellationToken);

        await _repository.SaveChangesAsync(cancellationToken);

        return RecordFullscreenExitResult.Ok(attempt.FullscreenExitCount);
    }
}
