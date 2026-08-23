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

        attempt.Status = command.IsAutoSubmitted ? AttemptStatus.AutoSubmitted : AttemptStatus.Submitted;
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
                    AttemptId = attempt.Id,
                    QuestionId = answer.QuestionId,
                    AnswerText = answer.AnswerText!,
                },
                cancellationToken);
        }

        return SubmitAttemptResult.Ok(attempt);
    }
}
