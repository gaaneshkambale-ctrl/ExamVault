using System.Text.Json;
using FluentValidation;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;

namespace OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;

public class SaveAnswerHandler
{
    private readonly ISubmissionRepository _repository;
    private readonly IValidator<SaveAnswerCommand> _validator;
    private readonly IExamLookupClient _examLookupClient;
    private readonly IQuestionLookupClient _questionLookupClient;

    public SaveAnswerHandler(
        ISubmissionRepository repository,
        IValidator<SaveAnswerCommand> validator,
        IExamLookupClient examLookupClient,
        IQuestionLookupClient questionLookupClient)
    {
        _repository = repository;
        _validator = validator;
        _examLookupClient = examLookupClient;
        _questionLookupClient = questionLookupClient;
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

        // Server-side backstop for the exam timer: without this, nothing stops a
        // student from continuing to answer indefinitely if their browser's own
        // countdown never fires (closed tab, clock tampering, JS disabled). Submit
        // itself is deliberately NOT blocked the same way - see SubmitAttemptHandler.
        if (attempt.ExpiresAtUtc is { } expiresAtUtc && DateTime.UtcNow > expiresAtUtc)
        {
            return SaveAnswerResult.Expired();
        }

        // Server-side backstop for Sequential/Locked section navigation - the
        // client already enforces this, but a direct API call must not be able
        // to bypass it. Free sections (and non-sectioned exams) skip the lookup
        // entirely, so this costs nothing for the common case.
        var navigationRejection = await CheckSectionNavigationAsync(
            command.AttemptId,
            attempt.ExamId,
            command.QuestionId,
            command.BearerToken,
            cancellationToken);
        if (navigationRejection is not null)
        {
            return navigationRejection;
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

    private async Task<SaveAnswerResult?> CheckSectionNavigationAsync(
        Guid attemptId,
        Guid examId,
        Guid questionId,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        var questions = await _questionLookupClient.GetQuestionsAsync(examId, bearerToken, cancellationToken);
        var targetQuestion = questions.FirstOrDefault(q => q.QuestionId == questionId);
        if (targetQuestion?.SectionId is not { } sectionId)
        {
            // Non-sectioned exam (or a question the lookup didn't return) -
            // there's no section-level navigation rule to enforce.
            return null;
        }

        var sections = await _examLookupClient.GetSectionsAsync(examId, bearerToken, cancellationToken);
        var section = sections.FirstOrDefault(s => s.Id == sectionId);
        if (section is null || string.Equals(section.NavigationType, "Free", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var existingAnswers = await _repository.GetAnswersByAttemptIdAsync(attemptId, cancellationToken);
        var answeredQuestionIds = existingAnswers.Where(IsAnswered).Select(a => a.QuestionId).ToHashSet();

        if (string.Equals(section.NavigationType, "Locked", StringComparison.OrdinalIgnoreCase))
        {
            // Once a question has a real saved answer, it's permanently
            // unreachable for the rest of the section - matches the client's
            // own definition of "answered" (a real selection/text, not merely
            // having been visited).
            return answeredQuestionIds.Contains(questionId) ? SaveAnswerResult.QuestionLocked() : null;
        }

        // Sequential: every earlier question in the section (by canonical,
        // unshuffled creation order) must already be answered. A shuffled
        // Sequential section can't be verified precisely server-side - the
        // per-student shuffle seed is generated client-side and never sent to
        // the server - so this is a meaningful but shuffle-unaware backstop;
        // it's exact for the common case (Sequential with shuffling off,
        // the only combination that's actually self-consistent).
        var sectionQuestionIds = questions
            .Where(q => q.SectionId == sectionId)
            .OrderBy(q => q.CreatedOn)
            .Select(q => q.QuestionId)
            .ToList();

        var targetPosition = sectionQuestionIds.IndexOf(questionId);
        for (var i = 0; i < targetPosition; i++)
        {
            if (!answeredQuestionIds.Contains(sectionQuestionIds[i]))
            {
                return SaveAnswerResult.OutOfSequence();
            }
        }

        return null;
    }

    private static bool IsAnswered(AttemptAnswer answer) =>
        answer.SelectedOptionId is not null
        || !string.IsNullOrEmpty(answer.SelectedOptionIdsJson)
        || !string.IsNullOrEmpty(answer.AnswerText);
}
