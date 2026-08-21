using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;

// Admin-initiated counterpart to SubmitAttemptHandler - Live Monitoring's
// "End Session" action. Deliberately a separate handler rather than adding
// an admin-override flag to the student-facing SubmitAttemptCommand: the two
// have different authorization models (student can only submit their own
// attempt, admin can end anyone's) and keeping them apart avoids risking a
// mistake in the already-shipped student submit flow.
public class ForceSubmitAttemptHandler
{
    private readonly ISubmissionRepository _repository;

    public ForceSubmitAttemptHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<ForceSubmitAttemptResult> HandleAsync(
        ForceSubmitAttemptCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return ForceSubmitAttemptResult.AttemptNotFound();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return ForceSubmitAttemptResult.AlreadySubmitted();
        }

        attempt.Status = AttemptStatus.AutoSubmitted;
        attempt.SubmittedAtUtc = DateTime.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);

        return ForceSubmitAttemptResult.Ok(attempt);
    }
}
