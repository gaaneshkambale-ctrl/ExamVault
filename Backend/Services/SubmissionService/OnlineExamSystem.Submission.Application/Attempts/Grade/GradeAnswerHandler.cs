using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Application.Attempts.Grade;

public class GradeAnswerHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IValidator<GradeAnswerCommand> _validator;
    private readonly IExamLookupClient _examLookupClient;

    public GradeAnswerHandler(
        ISubmissionRepository repository,
        IValidator<GradeAnswerCommand> validator,
        IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _validator = validator;
        _examLookupClient = examLookupClient;
    }

    public async Task<GradeAnswerResult> HandleAsync(
        GradeAnswerCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return GradeAnswerResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        if (command.OwnerUserId is { } ownerUserId)
        {
            var attempt = await _repository.GetAttemptByIdAsync(command.AttemptId, cancellationToken);
            if (attempt is null)
            {
                return GradeAnswerResult.NotFound();
            }

            var exam = await _examLookupClient.GetExamAsync(attempt.ExamId, command.BearerToken, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return GradeAnswerResult.Forbidden();
            }
        }

        var answer = await _repository.GetAnswerAsync(command.AttemptId, command.QuestionId, cancellationToken);
        if (answer is null)
        {
            return GradeAnswerResult.NotFound();
        }

        if (answer.AnswerText is null)
        {
            return GradeAnswerResult.NotAnswered();
        }

        answer.MarksAwarded = command.MarksAwarded;
        answer.GradedByUserId = command.GradedByUserId;
        answer.GradedAtUtc = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        return GradeAnswerResult.Ok(answer);
    }
}
