using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;

public class RecordProctoringViolationHandler
{
    private readonly ISubmissionRepository _repository;

    public RecordProctoringViolationHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

    // Multiple-faces/monitors are the strongest real signals of someone else
    // being involved - no-face and tab/window behavior are concerning but
    // more often innocent (bad camera angle, alt-tabbing to a calculator);
    // a bare right-click is the weakest signal, usually just habit.
    private static ViolationSeverity SeverityFor(ProctoringViolationType type) => type switch
    {
        ProctoringViolationType.MultipleFacesDetected => ViolationSeverity.Critical,
        ProctoringViolationType.MultipleMonitors => ViolationSeverity.Critical,
        ProctoringViolationType.RightClick => ViolationSeverity.Low,
        _ => ViolationSeverity.Medium,
    };

    public async Task<RecordProctoringViolationResult> HandleAsync(
        RecordProctoringViolationCommand command,
        CancellationToken cancellationToken = default)
    {
        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return RecordProctoringViolationResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return RecordProctoringViolationResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return RecordProctoringViolationResult.NotInProgress();
        }

        switch (command.Type)
        {
            case ProctoringViolationType.NoFaceDetected:
                attempt.NoFaceDetectedCount++;
                break;
            case ProctoringViolationType.MultipleFacesDetected:
                attempt.MultipleFacesDetectedCount++;
                break;
            case ProctoringViolationType.TabSwitch:
                attempt.TabSwitchCount++;
                break;
            case ProctoringViolationType.MultipleTabs:
                attempt.MultipleTabsCount++;
                break;
            case ProctoringViolationType.CopyPaste:
                attempt.CopyPasteCount++;
                break;
            case ProctoringViolationType.RightClick:
                attempt.RightClickCount++;
                break;
            case ProctoringViolationType.MultipleMonitors:
                attempt.MultipleMonitorsCount++;
                break;
        }

        await _repository.AddViolationEventAsync(
            new ViolationEvent
            {
                AttemptId = attempt.Id,
                Type = command.Type,
                Severity = SeverityFor(command.Type),
                DetectedAtUtc = DateTime.UtcNow,
            },
            cancellationToken);

        await _repository.SaveChangesAsync(cancellationToken);

        return RecordProctoringViolationResult.Ok(attempt);
    }
}
