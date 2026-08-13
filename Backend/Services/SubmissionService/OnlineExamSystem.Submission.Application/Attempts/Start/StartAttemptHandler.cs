using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.Start;

public class StartAttemptHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IExamLookupClient _examLookupClient;
    private readonly IValidator<StartAttemptCommand> _validator;

    public StartAttemptHandler(
        ISubmissionRepository repository,
        IExamLookupClient examLookupClient,
        IValidator<StartAttemptCommand> validator)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
        _validator = validator;
    }

    public async Task<StartAttemptResult> HandleAsync(
        StartAttemptCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return StartAttemptResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        // Accidental-refresh safety net: return the existing InProgress attempt
        // rather than creating a second one. Not something the UI advertises.
        var existingAttempt = await _repository.GetInProgressAttemptAsync(
            command.ExamId,
            command.UserId,
            cancellationToken);
        if (existingAttempt is not null)
        {
            return StartAttemptResult.Ok(existingAttempt);
        }

        var exam = await _examLookupClient.GetExamAsync(command.ExamId, command.BearerToken, cancellationToken);
        if (exam is null)
        {
            return StartAttemptResult.ExamNotFound();
        }

        var now = DateTime.UtcNow;
        if ((exam.StartAtUtc is { } startAt && now < startAt) || (exam.EndAtUtc is { } endAt && now > endAt))
        {
            return StartAttemptResult.OutsideSchedulingWindow();
        }

        var attemptCount = await _repository.CountAttemptsAsync(command.ExamId, command.UserId, cancellationToken);
        if (attemptCount >= exam.MaxAttempts)
        {
            return StartAttemptResult.MaxAttemptsExceeded();
        }

        var attempt = new ExamAttempt
        {
            ExamId = command.ExamId,
            UserId = command.UserId,
            AttemptNumber = attemptCount + 1,
            StartedAtUtc = now,
            Status = AttemptStatus.InProgress,
        };

        await _repository.AddAttemptAsync(attempt, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return StartAttemptResult.Ok(attempt);
    }
}
