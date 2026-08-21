using OnlineExamSystem.Submission.Application.Attempts.JoinRecording;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class JoinRecordingHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    private static JoinRecordingHandler CreateHandler(
        FakeSubmissionRepository repository,
        AssignmentLookupResult? assignment,
        FakeVideoRecordingService? videoRecordingService = null) =>
        new(repository, new FakeAssignmentLookupClient(assignment), videoRecordingService ?? new FakeVideoRecordingService());

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = ExamId,
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    private static AssignmentLookupResult ProctoredAssignment() => new(
        Guid.NewGuid(),
        ExamId,
        StartAtUtc: DateTime.UtcNow.AddDays(-1),
        EndAtUtc: DateTime.UtcNow.AddDays(1),
        MaxAttempts: 1,
        EnableProctoring: true);

    [Fact]
    public async Task Returns_room_and_token_when_proctoring_is_enabled()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var video = new FakeVideoRecordingService();
        var handler = CreateHandler(repository, ProctoredAssignment(), video);

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, UserId, "test-token"));

        Assert.True(result.Success);
        Assert.Equal($"fake.metered.live/attempt-{attempt.Id}", result.RoomUrl);
        Assert.Equal("fake-token", result.Token);
        Assert.Contains($"attempt-{attempt.Id}", video.EnsuredRooms);
    }

    [Fact]
    public async Task Returns_nulls_without_error_when_proctoring_is_not_enabled()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var assignment = ProctoredAssignment() with { EnableProctoring = false };
        var video = new FakeVideoRecordingService();
        var handler = CreateHandler(repository, assignment, video);

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, UserId, "test-token"));

        Assert.True(result.Success);
        Assert.Null(result.RoomUrl);
        Assert.Null(result.Token);
        Assert.Empty(video.EnsuredRooms);
    }

    [Fact]
    public async Task Returns_nulls_without_error_when_the_student_has_no_assignment()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository, assignment: null);

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, UserId, "test-token"));

        Assert.True(result.Success);
        Assert.Null(result.RoomUrl);
        Assert.Null(result.Token);
    }

    [Fact]
    public async Task Returns_nulls_when_the_video_provider_fails_to_issue_a_token()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var video = new FakeVideoRecordingService(ensureRoomSucceeds: false, token: null);
        var handler = CreateHandler(repository, ProctoredAssignment(), video);

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, UserId, "test-token"));

        Assert.True(result.Success);
        Assert.Null(result.RoomUrl);
        Assert.Null(result.Token);
    }

    [Fact]
    public async Task Still_tries_a_token_even_when_ensure_room_reports_failure()
    {
        // Simulates the "room already exists from an earlier join" case -
        // EnsureRoomExistsAsync can fail/no-op while the room is still
        // genuinely joinable, so token creation is the real success signal.
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var video = new FakeVideoRecordingService(ensureRoomSucceeds: false, token: "fake-token");
        var handler = CreateHandler(repository, ProctoredAssignment(), video);

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, UserId, "test-token"));

        Assert.True(result.Success);
        Assert.NotNull(result.RoomUrl);
        Assert.Equal("fake-token", result.Token);
    }

    [Fact]
    public async Task Returns_forbidden_for_another_users_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository, ProctoredAssignment());

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, OtherUserId, "test-token"));

        Assert.True(result.IsForbidden);
    }

    [Fact]
    public async Task Returns_not_in_progress_for_a_completed_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository, ProctoredAssignment());

        var result = await handler.HandleAsync(new JoinRecordingCommand(attempt.Id, UserId, "test-token"));

        Assert.True(result.IsNotInProgress);
    }

    [Fact]
    public async Task Returns_not_found_for_an_unknown_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository, ProctoredAssignment());

        var result = await handler.HandleAsync(new JoinRecordingCommand(Guid.NewGuid(), UserId, "test-token"));

        Assert.True(result.IsAttemptNotFound);
    }
}
