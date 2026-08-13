using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.Submit;

public class SubmitAttemptHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IValidator<SubmitAttemptCommand> _validator;

    public SubmitAttemptHandler(ISubmissionRepository repository, IValidator<SubmitAttemptCommand> validator)
    {
        _repository = repository;
        _validator = validator;
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

        return SubmitAttemptResult.Ok(attempt);
    }
}
