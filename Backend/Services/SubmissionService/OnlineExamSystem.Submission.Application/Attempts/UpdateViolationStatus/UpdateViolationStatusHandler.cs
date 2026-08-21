using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;

public class UpdateViolationStatusHandler
{
    private readonly ISubmissionRepository _repository;

    public UpdateViolationStatusHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<UpdateViolationStatusResult> HandleAsync(
        UpdateViolationStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        var violationEvent = await _repository.GetViolationEventByIdAsync(command.ViolationId, cancellationToken);
        if (violationEvent is null)
        {
            return UpdateViolationStatusResult.NotFound();
        }

        violationEvent.Status = command.NewStatus;
        if (command.NewStatus == ViolationStatus.Resolved)
        {
            violationEvent.ResolvedAtUtc = DateTime.UtcNow;
            violationEvent.ResolvedByAdminUserId = command.AdminUserId;
        }
        else
        {
            // Moving back out of Resolved (e.g. reopened) clears the
            // resolution record - it's no longer accurate.
            violationEvent.ResolvedAtUtc = null;
            violationEvent.ResolvedByAdminUserId = null;
        }

        await _repository.SaveChangesAsync(cancellationToken);

        return UpdateViolationStatusResult.Ok(violationEvent);
    }
}
