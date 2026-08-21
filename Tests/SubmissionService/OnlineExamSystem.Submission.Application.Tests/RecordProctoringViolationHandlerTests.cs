using OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class RecordProctoringViolationHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();

    private static RecordProctoringViolationHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = Guid.NewGuid(),
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    [Theory]
    [InlineData(ProctoringViolationType.MultipleFacesDetected, ViolationSeverity.Critical)]
    [InlineData(ProctoringViolationType.MultipleMonitors, ViolationSeverity.Critical)]
    [InlineData(ProctoringViolationType.RightClick, ViolationSeverity.Low)]
    [InlineData(ProctoringViolationType.TabSwitch, ViolationSeverity.Medium)]
    [InlineData(ProctoringViolationType.NoFaceDetected, ViolationSeverity.Medium)]
    [InlineData(ProctoringViolationType.MultipleTabs, ViolationSeverity.Medium)]
    [InlineData(ProctoringViolationType.CopyPaste, ViolationSeverity.Medium)]
    public async Task Records_a_timestamped_open_event_with_the_expected_severity(
        ProctoringViolationType type,
        ViolationSeverity expectedSeverity)
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RecordProctoringViolationCommand(attempt.Id, UserId, type));

        Assert.True(result.Success);
        var recorded = Assert.Single(repository.ViolationEvents);
        Assert.Equal(attempt.Id, recorded.AttemptId);
        Assert.Equal(type, recorded.Type);
        Assert.Equal(expectedSeverity, recorded.Severity);
        Assert.Equal(ViolationStatus.Open, recorded.Status);
        Assert.Null(recorded.ResolvedAtUtc);
    }

    [Fact]
    public async Task Still_increments_the_matching_counter_alongside_the_new_event()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new RecordProctoringViolationCommand(attempt.Id, UserId, ProctoringViolationType.TabSwitch));

        Assert.Equal(1, result.TabSwitchCount);
        Assert.Single(repository.ViolationEvents);
    }

    [Fact]
    public async Task Does_not_record_an_event_when_the_attempt_is_not_in_progress()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new RecordProctoringViolationCommand(attempt.Id, UserId, ProctoringViolationType.TabSwitch));

        Assert.True(result.IsNotInProgress);
        Assert.Empty(repository.ViolationEvents);
    }
}
