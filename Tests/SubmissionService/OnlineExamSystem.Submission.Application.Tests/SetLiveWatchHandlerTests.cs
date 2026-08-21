using OnlineExamSystem.Submission.Application.Attempts.SetLiveWatch;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class SetLiveWatchHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = ExamId,
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    [Fact]
    public async Task Turns_live_watch_on()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = new SetLiveWatchHandler(repository);

        var result = await handler.HandleAsync(new SetLiveWatchCommand(attempt.Id, Enabled: true));

        Assert.True(result.Success);
        Assert.True(result.LiveWatchEnabled);
        Assert.True(attempt.LiveWatchEnabled);
    }

    [Fact]
    public async Task Turns_live_watch_off()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.LiveWatchEnabled = true;
        repository.SeedAttempt(attempt);
        var handler = new SetLiveWatchHandler(repository);

        var result = await handler.HandleAsync(new SetLiveWatchCommand(attempt.Id, Enabled: false));

        Assert.True(result.Success);
        Assert.False(result.LiveWatchEnabled);
        Assert.False(attempt.LiveWatchEnabled);
    }

    [Fact]
    public async Task Returns_not_found_for_an_unknown_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var handler = new SetLiveWatchHandler(repository);

        var result = await handler.HandleAsync(new SetLiveWatchCommand(Guid.NewGuid(), Enabled: true));

        Assert.True(result.IsAttemptNotFound);
    }

    [Fact]
    public async Task Returns_not_in_progress_for_a_completed_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = new SetLiveWatchHandler(repository);

        var result = await handler.HandleAsync(new SetLiveWatchCommand(attempt.Id, Enabled: true));

        Assert.True(result.IsNotInProgress);
    }
}
