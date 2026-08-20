using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.CompleteSection;

public class CompleteSectionHandler
{
    private readonly ISubmissionRepository _repository;

    public CompleteSectionHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<CompleteSectionResult> HandleAsync(
        CompleteSectionCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return CompleteSectionResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return CompleteSectionResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return CompleteSectionResult.NotInProgress();
        }

        var state = await _repository.GetSectionStateAsync(command.AttemptId, command.SectionId, cancellationToken);
        var now = DateTime.UtcNow;

        if (state is null)
        {
            // Defensive: complete without a prior enter (shouldn't normally happen from the
            // UI, but leaves a consistent, already-completed state rather than failing).
            state = new AttemptSectionState
            {
                AttemptId = command.AttemptId,
                SectionId = command.SectionId,
                EnteredAtUtc = now,
                DeadlineUtc = now,
                IsCompleted = true,
                CompletedAtUtc = now,
            };
            await _repository.AddSectionStateAsync(state, cancellationToken);
        }
        else if (!state.IsCompleted)
        {
            state.IsCompleted = true;
            state.CompletedAtUtc = now;
        }

        await _repository.SaveChangesAsync(cancellationToken);
        return CompleteSectionResult.Ok(state);
    }
}
