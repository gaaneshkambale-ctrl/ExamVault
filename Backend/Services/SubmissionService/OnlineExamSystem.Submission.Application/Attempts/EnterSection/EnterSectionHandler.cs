using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.EnterSection;

public class EnterSectionHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public EnterSectionHandler(ISubmissionRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
    }

    public async Task<EnterSectionResult> HandleAsync(
        EnterSectionCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return EnterSectionResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return EnterSectionResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return EnterSectionResult.NotInProgress();
        }

        var sections = await _examLookupClient.GetSectionsAsync(
            attempt.ExamId,
            command.BearerToken,
            cancellationToken);
        var orderedSections = sections.OrderBy(s => s.DisplayOrder).ToList();

        var targetSection = orderedSections.FirstOrDefault(s => s.Id == command.SectionId);
        if (targetSection is null)
        {
            return EnterSectionResult.SectionNotFound();
        }

        // Sequential/Locked sections must be finished (in DisplayOrder) before a later
        // section can be entered - Free sections never block progression, for themselves
        // or for anything after them.
        var targetIndex = orderedSections.IndexOf(targetSection);
        for (var i = 0; i < targetIndex; i++)
        {
            var earlier = orderedSections[i];
            if (string.Equals(earlier.NavigationType, "Free", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var earlierState = await _repository.GetSectionStateAsync(command.AttemptId, earlier.Id, cancellationToken);
            if (earlierState is null || !earlierState.IsCompleted)
            {
                return EnterSectionResult.SectionLocked();
            }
        }

        var existingState = await _repository.GetSectionStateAsync(command.AttemptId, command.SectionId, cancellationToken);
        if (existingState is not null)
        {
            var isGated = !string.Equals(targetSection.NavigationType, "Free", StringComparison.OrdinalIgnoreCase);
            if (existingState.IsCompleted && isGated)
            {
                return EnterSectionResult.SectionAlreadyCompleted();
            }

            return EnterSectionResult.Ok(existingState);
        }

        var now = DateTime.UtcNow;
        var newState = new AttemptSectionState
        {
            AttemptId = command.AttemptId,
            SectionId = command.SectionId,
            EnteredAtUtc = now,
            DeadlineUtc = now.AddMinutes(targetSection.DurationMinutes),
            IsCompleted = false,
        };

        await _repository.AddSectionStateAsync(newState, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return EnterSectionResult.Ok(newState);
    }
}
