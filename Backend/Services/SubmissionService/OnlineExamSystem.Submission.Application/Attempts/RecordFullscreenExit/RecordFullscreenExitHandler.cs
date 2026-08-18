using OnlineExamSystem.Submission.Application.Interfaces;
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
        await _repository.SaveChangesAsync(cancellationToken);

        return RecordFullscreenExitResult.Ok(attempt.FullscreenExitCount);
    }
}
