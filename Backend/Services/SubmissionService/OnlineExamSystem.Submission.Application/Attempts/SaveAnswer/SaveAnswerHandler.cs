using System.Text.Json;
using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;

public class SaveAnswerHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IValidator<SaveAnswerCommand> _validator;

    public SaveAnswerHandler(ISubmissionRepository repository, IValidator<SaveAnswerCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<SaveAnswerResult> HandleAsync(
        SaveAnswerCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return SaveAnswerResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
        if (attempt is null)
        {
            return SaveAnswerResult.AttemptNotFound();
        }

        if (attempt.UserId != command.UserId)
        {
            return SaveAnswerResult.Forbidden();
        }

        if (attempt.Status != AttemptStatus.InProgress)
        {
            return SaveAnswerResult.NotInProgress();
        }

        var selectedOptionIdsJson = command.SelectedOptionIds is { Count: > 0 }
            ? JsonSerializer.Serialize(command.SelectedOptionIds)
            : null;

        // Atomic insert-or-update at the repository layer - avoids the
        // check-then-insert race this used to do inline here, which could
        // lose a save to an unhandled unique-constraint violation when two
        // saves for the same question landed near-simultaneously.
        var answer = await _repository.UpsertAnswerAsync(
            command.AttemptId,
            command.QuestionId,
            command.SelectedOptionId,
            selectedOptionIdsJson,
            command.IsMarkedForReview,
            command.AnswerText,
            DateTime.UtcNow,
            cancellationToken);

        return SaveAnswerResult.Ok(answer);
    }
}
