using OnlineExamSystem.Submission.Application.Attempts.Start;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class StartAttemptHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();

    private static StartAttemptHandler CreateHandler(
        FakeSubmissionRepository repository,
        ExamLookupResult? exam) =>
        new(repository, new FakeExamLookupClient(exam), new StartAttemptValidator());

    private static StartAttemptCommand ValidCommand() => new(ExamId, UserId, "test-token");

    private static ExamLookupResult OpenExam(int maxAttempts = 3) =>
        new(ExamId, "Published", maxAttempts, StartAtUtc: null, EndAtUtc: null);

    [Fact]
    public async Task Valid_request_creates_new_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository, OpenExam());

        var result = await handler.HandleAsync(ValidCommand());

        Assert.True(result.Success);
        Assert.NotNull(result.Attempt);
        Assert.Equal(AttemptStatus.InProgress, result.Attempt!.Status);
        Assert.Equal(1, result.Attempt.AttemptNumber);
        Assert.Single(repository.Attempts);
    }

    [Fact]
    public async Task Existing_in_progress_attempt_is_returned_instead_of_duplicated()
    {
        var repository = new FakeSubmissionRepository();
        var existing = new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-5),
            Status = AttemptStatus.InProgress,
        };
        repository.SeedAttempt(existing);
        var handler = CreateHandler(repository, OpenExam());

        var result = await handler.HandleAsync(ValidCommand());

        Assert.True(result.Success);
        Assert.Equal(existing.Id, result.Attempt!.Id);
        Assert.Single(repository.Attempts);
    }

    [Fact]
    public async Task Max_attempts_exceeded_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddDays(-1),
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-1),
            Status = AttemptStatus.Submitted,
        });
        var handler = CreateHandler(repository, OpenExam(maxAttempts: 1));

        var result = await handler.HandleAsync(ValidCommand());

        Assert.False(result.Success);
        Assert.True(result.IsMaxAttemptsExceeded);
        Assert.Single(repository.Attempts);
    }

    [Fact]
    public async Task Outside_scheduling_window_before_start_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        var exam = OpenExam() with { StartAtUtc = DateTime.UtcNow.AddDays(1) };
        var handler = CreateHandler(repository, exam);

        var result = await handler.HandleAsync(ValidCommand());

        Assert.False(result.Success);
        Assert.True(result.IsOutsideSchedulingWindow);
        Assert.Empty(repository.Attempts);
    }

    [Fact]
    public async Task Outside_scheduling_window_after_end_returns_failure()
    {
        var repository = new FakeSubmissionRepository();
        var exam = OpenExam() with { EndAtUtc = DateTime.UtcNow.AddDays(-1) };
        var handler = CreateHandler(repository, exam);

        var result = await handler.HandleAsync(ValidCommand());

        Assert.False(result.Success);
        Assert.True(result.IsOutsideSchedulingWindow);
        Assert.Empty(repository.Attempts);
    }
}
