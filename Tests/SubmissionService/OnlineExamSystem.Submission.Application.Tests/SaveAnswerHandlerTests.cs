using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
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

    private static SaveAnswerHandler CreateHandler(FakeSubmissionRepository repository) =>
        new(repository, new SaveAnswerValidator());

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
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId));

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
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: true, UserId));

        Assert.True(result.Success);
        Assert.Equal(OptionId, result.Answer!.SelectedOptionId);
        Assert.True(result.Answer.IsMarkedForReview);
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
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, UserId));

        Assert.False(result.Success);
        Assert.True(result.IsNotInProgress);
        Assert.Empty(repository.Answers);
    }

    [Fact]
    public async Task Attempt_belongs_to_another_user_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new SaveAnswerCommand(attempt.Id, QuestionId, OptionId, IsMarkedForReview: false, OtherUserId));

        Assert.False(result.Success);
        Assert.True(result.IsForbidden);
        Assert.Empty(repository.Answers);
    }
}
