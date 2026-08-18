using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;

public class RecordProctoringViolationHandler
{
    private readonly ISubmissionRepository _repository;

    public RecordProctoringViolationHandler(ISubmissionRepository repository)
    {
        _repository = repository;
    }

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
        }

        await _repository.SaveChangesAsync(cancellationToken);

        return RecordProctoringViolationResult.Ok(attempt);
    }
}
