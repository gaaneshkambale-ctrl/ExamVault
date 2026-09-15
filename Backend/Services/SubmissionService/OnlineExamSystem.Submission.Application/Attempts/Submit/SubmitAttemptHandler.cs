using FluentValidation;
using OnlineExamSystem.Shared.Events.Publishing;
using OnlineExamSystem.Shared.Events.Submission;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.Submit;

public class SubmitAttemptHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IValidator<SubmitAttemptCommand> _validator;
    private readonly IEventPublisher _eventPublisher;

    public SubmitAttemptHandler(
        ISubmissionRepository repository,
        IValidator<SubmitAttemptCommand> validator,
        IEventPublisher eventPublisher)
    {
        _repository = repository;
        _validator = validator;
        _eventPublisher = eventPublisher;
    }

    public async Task<SubmitAttemptResult> HandleAsync(
        SubmitAttemptCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return SubmitAttemptResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return SubmitAttemptResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return SubmitAttemptResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return SubmitAttemptResult.AlreadySubmitted();
        }

        // Submit is never blocked by expiry - a late request still captures real,
        // already-in-progress work, and hard-blocking it would just lose that work.
        // Instead, the server overrides the client-reported IsAutoSubmitted once
        // time is actually up, rather than trusting the client's own claim - this
        // is what makes "auto-submit when time expires" true even if the client's
        // own countdown never fired (closed tab, clock tampering, JS disabled).
        var isPastExpiry = attempt.ExpiresAtUtc is { } expiresAtUtc && DateTime.UtcNow > expiresAtUtc;
        attempt.Status = command.IsAutoSubmitted || isPastExpiry ? AttemptStatus.AutoSubmitted : AttemptStatus.Submitted;
        attempt.SubmittedAtUtc = DateTime.UtcNow;
        await _repository.SaveChangesAsync(cancellationToken);

        // Fire-and-forget from the caller's perspective - one event per free-text
        // answer (never mind whether its question actually has test cases; the
        // consumer decides that). Submission Service doesn't need to know
        // "CodeProgram" as a concept, only that AnswerText is set, same
        // decoupling already used for the Pending Grading queue.
        var answers = await _repository.GetAnswersByAttemptIdAsync(command.AttemptId, cancellationToken);
        foreach (var answer in answers.Where(a => a.AnswerText is not null))
        {
            await _eventPublisher.PublishAsync(
                new CodeAnswerSubmittedEvent
                {
                    TenantId = attempt.TenantId,
                    AttemptId = attempt.Id,
                    QuestionId = answer.QuestionId,
                    AnswerText = answer.AnswerText!,
                },
                cancellationToken);
        }

        return SubmitAttemptResult.Ok(attempt);
    }
}
