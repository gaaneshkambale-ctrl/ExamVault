using OnlineExamSystem.Submission.Application.Attempts.RecordFullscreenExit;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class RecordFullscreenExitHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();

    private static RecordFullscreenExitHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = Guid.NewGuid(),
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    [Fact]
    public async Task Increments_the_counter_and_records_a_matching_violation_event()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RecordFullscreenExitCommand(attempt.Id, UserId));

        Assert.True(result.Success);
        Assert.Equal(1, result.FullscreenExitCount);
        var recorded = Assert.Single(repository.ViolationEvents);
        Assert.Equal(attempt.Id, recorded.AttemptId);
        Assert.Equal(ProctoringViolationType.FullscreenExit, recorded.Type);
        Assert.Equal(ViolationSeverity.Medium, recorded.Severity);
        Assert.Equal(ViolationStatus.Open, recorded.Status);
    }

    [Fact]
    public async Task Does_not_record_an_event_when_the_attempt_is_not_in_progress()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RecordFullscreenExitCommand(attempt.Id, UserId));

        Assert.True(result.IsNotInProgress);
        Assert.Empty(repository.ViolationEvents);
    }
}
