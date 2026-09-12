using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class SaveAnswerHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();
    private static readonly Guid QuestionId = Guid.NewGuid();
    private static readonly Guid OptionId = Guid.NewGuid();

    private const string BearerToken = "test-token";

    private static SaveAnswerHandler CreateHandler(
        FakeSubmissionRepository repository,
        FakeExamLookupClient? examLookupClient = null,
        FakeQuestionLookupClient? questionLookupClient = null) =>
        new(
            repository,
            new SaveAnswerValidator(),
            examLookupClient ?? new FakeExamLookupClient(null),
            questionLookupClient ?? new FakeQuestionLookupClient());

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = Guid.NewGuid(),
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    [Fact]
    public async Task Valid_request_creates_new_answer()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.True(result.Success);
        Assert.Equal(OptionId, result.Answer!.SelectedOptionId);
        Assert.Single(repository.Answers);
    }

    [Fact]
    public async Task Valid_request_updates_existing_answer()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = QuestionId,
            SelectedOptionId = null,
            IsMarkedForReview = false,
            AnsweredAtUtc = DateTime.UtcNow.AddMinutes(-1),
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: true, UserId, BearerToken));

        Assert.True(result.Success);
        Assert.Equal(OptionId, result.Answer!.SelectedOptionId);
        Assert.True(result.Answer.IsMarkedForReview);
        Assert.Single(repository.Answers);
    }

    [Fact]
    public async Task Valid_request_saves_answer_text_for_code_question()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(
                attempt.Id,
                QuestionId,
                SelectedOptionId: null,
                IsMarkedForReview: false,
                UserId,
                BearerToken,
                AnswerText: "print('hello')"));

        Assert.True(result.Success);
        Assert.Equal("print('hello')", result.Answer!.AnswerText);
        Assert.Single(repository.Answers);
    }

    [Fact]
    public async Task Attempt_not_in_progress_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        attempt.SubmittedAtUtc = DateTime.UtcNow;
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.False(result.Success);
        Assert.True(result.IsNotInProgress);
        Assert.Empty(repository.Answers);
    }

    [Fact]
    public async Task Attempt_past_its_expiry_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.False(result.Success);
        Assert.True(result.IsExpired);
        Assert.Empty(repository.Answers);
    }

    [Fact]
    public async Task Attempt_before_its_expiry_succeeds()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(30);
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Attempt_belongs_to_another_user_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, OtherUserId, BearerToken));

        Assert.False(result.Success);
        Assert.True(result.IsForbidden);
        Assert.Empty(repository.Answers);
    }

    [Fact]
    public async Task Locked_section_rejects_resaving_an_already_answered_question()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = QuestionId,
            SelectedOptionId = OptionId,
            AnsweredAtUtc = DateTime.UtcNow.AddMinutes(-1),
        });
        var sectionId = Guid.NewGuid();
        var examLookupClient = new FakeExamLookupClient(
            null,
            [new SectionLookupResult(sectionId, "Section 1", 1, 30, "Locked", false, 0, false, false, true)]);
        var questionLookupClient = new FakeQuestionLookupClient(
            [new QuestionLookupResult(QuestionId, sectionId, DateTime.UtcNow.AddMinutes(-10))]);
        var handler = CreateHandler(repository, examLookupClient, questionLookupClient);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.False(result.Success);
        Assert.True(result.IsQuestionLocked);
    }

    [Fact]
    public async Task Sequential_section_rejects_answering_out_of_order()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var sectionId = Guid.NewGuid();
        var firstQuestionId = Guid.NewGuid();
        var examLookupClient = new FakeExamLookupClient(
            null,
            [new SectionLookupResult(sectionId, "Section 1", 1, 30, "Sequential", false, 0, false, false, true)]);
        var questionLookupClient = new FakeQuestionLookupClient(
        [
            new QuestionLookupResult(firstQuestionId, sectionId, DateTime.UtcNow.AddMinutes(-10)),
            new QuestionLookupResult(QuestionId, sectionId, DateTime.UtcNow.AddMinutes(-5)),
        ]);
        var handler = CreateHandler(repository, examLookupClient, questionLookupClient);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.False(result.Success);
        Assert.True(result.IsOutOfSequence);
        Assert.Empty(repository.Answers);
    }

    [Fact]
    public async Task Sequential_section_allows_answering_in_order()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = Guid.NewGuid(),
            SelectedOptionId = OptionId,
            AnsweredAtUtc = DateTime.UtcNow.AddMinutes(-1),
        });
        var firstQuestionId = repository.Answers[0].QuestionId;
        var sectionId = Guid.NewGuid();
        var examLookupClient = new FakeExamLookupClient(
            null,
            [new SectionLookupResult(sectionId, "Section 1", 1, 30, "Sequential", false, 0, false, false, true)]);
        var questionLookupClient = new FakeQuestionLookupClient(
        [
            new QuestionLookupResult(firstQuestionId, sectionId, DateTime.UtcNow.AddMinutes(-10)),
            new QuestionLookupResult(QuestionId, sectionId, DateTime.UtcNow.AddMinutes(-5)),
        ]);
        var handler = CreateHandler(repository, examLookupClient, questionLookupClient);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId, BearerToken));

        Assert.True(result.Success);
    }
}
