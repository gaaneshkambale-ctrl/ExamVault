using OnlineExamSystem.Submission.Application.Attempts.WatchRecording;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class WatchRecordingHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid AdminUserId = Guid.NewGuid();

    private static ExamAttempt InProgressWatchableAttempt() => new()
    {
        ExamId = ExamId,
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
        LiveWatchEnabled = true,
    };

    [Fact]
    public async Task Returns_room_and_token_when_live_watch_is_enabled()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressWatchableAttempt();
        repository.SeedAttempt(attempt);
        var video = new FakeVideoRecordingService();
        var handler = new WatchRecordingHandler(repository, video);

        var result = await handler.HandleAsync(new WatchRecordingCommand(attempt.Id, AdminUserId));

        Assert.True(result.Success);
        Assert.Equal($"fake.metered.live/attempt-{attempt.Id}", result.RoomUrl);
        Assert.Equal("fake-token", result.Token);
        Assert.Contains($"attempt-{attempt.Id}", video.EnsuredRooms);
        Assert.Contains(($"attempt-{attempt.Id}", AdminUserId), video.TokensCreatedFor);
    }

    [Fact]
    public async Task Returns_not_authorized_when_live_watch_has_not_been_granted()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressWatchableAttempt();
        attempt.LiveWatchEnabled = false;
        repository.SeedAttempt(attempt);
        var video = new FakeVideoRecordingService();
        var handler = new WatchRecordingHandler(repository, video);

        var result = await handler.HandleAsync(new WatchRecordingCommand(attempt.Id, AdminUserId));

        Assert.True(result.IsNotAuthorized);
        Assert.Empty(video.EnsuredRooms);
    }

    [Fact]
    public async Task Returns_nulls_when_the_video_provider_fails_to_issue_a_token()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressWatchableAttempt();
        repository.SeedAttempt(attempt);
        var video = new FakeVideoRecordingService(ensureRoomSucceeds: false, token: null);
        var handler = new WatchRecordingHandler(repository, video);

        var result = await handler.HandleAsync(new WatchRecordingCommand(attempt.Id, AdminUserId));

        Assert.True(result.Success);
        Assert.Null(result.RoomUrl);
        Assert.Null(result.Token);
    }

    [Fact]
    public async Task Returns_not_in_progress_for_a_completed_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressWatchableAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = new WatchRecordingHandler(repository, new FakeVideoRecordingService());

        var result = await handler.HandleAsync(new WatchRecordingCommand(attempt.Id, AdminUserId));

        Assert.True(result.IsNotInProgress);
    }

    [Fact]
    public async Task Returns_not_found_for_an_unknown_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var handler = new WatchRecordingHandler(repository, new FakeVideoRecordingService());

        var result = await handler.HandleAsync(new WatchRecordingCommand(Guid.NewGuid(), AdminUserId));

        Assert.True(result.IsAttemptNotFound);
    }
}
