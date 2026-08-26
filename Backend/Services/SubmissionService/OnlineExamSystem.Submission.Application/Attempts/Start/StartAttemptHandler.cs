using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.Start;

public class StartAttemptHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IExamLookupClient _examLookupClient;
    private readonly IAssignmentLookupClient _assignmentLookupClient;
    private readonly IValidator<StartAttemptCommand> _validator;

    public StartAttemptHandler(
        ISubmissionRepository repository,
        IExamLookupClient examLookupClient,
        IAssignmentLookupClient assignmentLookupClient,
        IValidator<StartAttemptCommand> validator)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
        _assignmentLookupClient = assignmentLookupClient;
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

        // The student's own assignment - created via the assignment wizard - carries
        // the actual scheduling window and attempt limit an admin configured for this
        // exam. It takes priority over the exam's own defaults; those only apply when
        // the student has no assignment at all (e.g. an exam opened without ever going
        // through the assignment flow).
        var assignment = await _assignmentLookupClient.GetMyAssignmentAsync(
            command.ExamId,
            command.BearerToken,
            cancellationToken);

        var effectiveMaxAttempts = assignment?.MaxAttempts ?? exam.MaxAttempts;
        DateTime? effectiveStartAt = assignment is not null ? assignment.StartAtUtc : exam.StartAtUtc;
        DateTime? effectiveEndAt = assignment is not null ? assignment.EndAtUtc : exam.EndAtUtc;

        var now = DateTime.UtcNow;
        if ((effectiveStartAt is { } startAt && now < startAt) || (effectiveEndAt is { } endAt && now > endAt))
        {
            return StartAttemptResult.OutsideSchedulingWindow();
        }

        var attemptCount = await _repository.CountAttemptsAsync(command.ExamId, command.UserId, cancellationToken);
        if (attemptCount >= effectiveMaxAttempts)
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
