using OnlineExamSystem.Shared.Events.Submission;
using OnlineExamSystem.Submission.Application.Attempts.Submit;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class SubmitAttemptHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    private static SubmitAttemptHandler CreateHandler(
        FakeSubmissionRepository repository,
        FakeEventPublisher? eventPublisher = null) =>
        new(repository, new SubmitAttemptValidator(), eventPublisher ?? new FakeEventPublisher());

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = Guid.NewGuid(),
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
        Status = AttemptStatus.InProgress,
    };

    [Fact]
    public async Task Valid_submit_marks_attempt_submitted()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new SubmitAttemptCommand(attempt.Id, UserId, IsAutoSubmitted: false));

        Assert.True(result.Success);
        Assert.Equal(AttemptStatus.Submitted, result.Attempt!.Status);
        Assert.NotNull(result.Attempt.SubmittedAtUtc);
    }

    [Fact]
    public async Task Valid_auto_submit_marks_attempt_auto_submitted()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new SubmitAttemptCommand(attempt.Id, UserId, IsAutoSubmitted: true));

        Assert.True(result.Success);
        Assert.Equal(AttemptStatus.AutoSubmitted, result.Attempt!.Status);
    }

    [Fact]
    public async Task Double_submit_is_rejected()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        attempt.SubmittedAtUtc = DateTime.UtcNow.AddMinutes(-1);
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new SubmitAttemptCommand(attempt.Id, UserId, IsAutoSubmitted: false));

        Assert.False(result.Success);
        Assert.True(result.IsAlreadySubmitted);
    }

    [Fact]
    public async Task Submitting_another_users_attempt_is_forbidden()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SubmitAttemptCommand(attempt.Id, OtherUserId, IsAutoSubmitted: false));

        Assert.False(result.Success);
        Assert.True(result.IsForbidden);
    }

    [Fact]
    public async Task Submitting_publishes_one_event_per_code_answer()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var codeQuestionId = Guid.NewGuid();
        var mcqQuestionId = Guid.NewGuid();
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = codeQuestionId,
            AnswerText = "def f(): pass",
            AnsweredAtUtc = DateTime.UtcNow,
        });
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attempt.Id,
            QuestionId = mcqQuestionId,
            SelectedOptionId = Guid.NewGuid(),
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var eventPublisher = new FakeEventPublisher();
        var handler = CreateHandler(repository, eventPublisher);

        await handler.HandleAsync(new SubmitAttemptCommand(attempt.Id, UserId, IsAutoSubmitted: false));

        var published = Assert.Single(eventPublisher.Published);
        var codeEvent = Assert.IsType<CodeAnswerSubmittedEvent>(published);
        Assert.Equal(codeQuestionId, codeEvent.QuestionId);
        Assert.Equal("def f(): pass", codeEvent.AnswerText);
    }

    [Fact]
    public async Task Submitting_unknown_attempt_returns_not_found()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SubmitAttemptCommand(Guid.NewGuid(), UserId, IsAutoSubmitted: false));

        Assert.False(result.Success);
        Assert.True(result.IsAttemptNotFound);
    }
}
