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
        ExamLookupResult? exam,
        AssignmentLookupResult? assignment = null) =>
        new(
            repository,
            new FakeExamLookupClient(exam),
            new FakeAssignmentLookupClient(assignment),
            new StartAttemptValidator());

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

    // Regression coverage for a real bug: the exam's own MaxAttempts/StartAtUtc/
    // EndAtUtc were being enforced instead of the student's assignment - so an admin
    // setting "3 attempts" on the assignment wizard had no effect if the exam itself
    // still defaulted to 1.
    [Fact]
    public async Task Assignment_max_attempts_overrides_exam_max_attempts()
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
        var assignment = new AssignmentLookupResult(
            Guid.NewGuid(),
            ExamId,
            StartAtUtc: DateTime.UtcNow.AddDays(-1),
            EndAtUtc: DateTime.UtcNow.AddDays(1),
            MaxAttempts: 3);
        // Exam itself only allows 1 - the assignment's 3 must win.
        var handler = CreateHandler(repository, OpenExam(maxAttempts: 1), assignment);

        var result = await handler.HandleAsync(ValidCommand());

        Assert.True(result.Success);
        Assert.Equal(2, result.Attempt!.AttemptNumber);
    }

    [Fact]
    public async Task Assignment_max_attempts_still_blocks_once_exhausted()
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
        var assignment = new AssignmentLookupResult(
            Guid.NewGuid(),
            ExamId,
            StartAtUtc: DateTime.UtcNow.AddDays(-1),
            EndAtUtc: DateTime.UtcNow.AddDays(1),
            MaxAttempts: 1);
        // Exam itself would allow 3 - the assignment's stricter limit of 1 must win.
        var handler = CreateHandler(repository, OpenExam(maxAttempts: 3), assignment);

        var result = await handler.HandleAsync(ValidCommand());

        Assert.False(result.Success);
        Assert.True(result.IsMaxAttemptsExceeded);
    }

    [Fact]
    public async Task Assignment_scheduling_window_overrides_exam_window()
    {
        var repository = new FakeSubmissionRepository();
        // Exam itself has no window at all (always open) - the assignment's window,
        // which hasn't started yet, must still block the attempt.
        var assignment = new AssignmentLookupResult(
            Guid.NewGuid(),
            ExamId,
            StartAtUtc: DateTime.UtcNow.AddDays(1),
            EndAtUtc: DateTime.UtcNow.AddDays(2),
            MaxAttempts: 3);
        var handler = CreateHandler(repository, OpenExam(), assignment);

        var result = await handler.HandleAsync(ValidCommand());

        Assert.False(result.Success);
        Assert.True(result.IsOutsideSchedulingWindow);
    }
}
