using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
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

        var existingAnswer = await _repository.GetAnswerAsync(
            command.AttemptId,
            command.QuestionId,
            cancellationToken);
        var now = DateTime.UtcNow;

        if (existingAnswer is null)
        {
            var answer = new AttemptAnswer
            {
                AttemptId = command.AttemptId,
                QuestionId = command.QuestionId,
                SelectedOptionId = command.SelectedOptionId,
                IsMarkedForReview = command.IsMarkedForReview,
                AnsweredAtUtc = now,
            };
            await _repository.AddAnswerAsync(answer, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);
            return SaveAnswerResult.Ok(answer);
        }

        existingAnswer.SelectedOptionId = command.SelectedOptionId;
        existingAnswer.IsMarkedForReview = command.IsMarkedForReview;
        existingAnswer.AnsweredAtUtc = now;
        await _repository.SaveChangesAsync(cancellationToken);

        return SaveAnswerResult.Ok(existingAnswer);
    }
}
