using OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class UpdateViolationStatusHandlerTests
{
    private static readonly Guid AdminUserId = Guid.NewGuid();

    private static UpdateViolationStatusHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    [Fact]
    public async Task Moves_an_open_violation_to_under_investigation()
    {
        var repository = new FakeSubmissionRepository();
        var violation = new ViolationEvent
        {
            AttemptId = Guid.NewGuid(),
            Type = ProctoringViolationType.MultipleFacesDetected,
            Severity = ViolationSeverity.Critical,
            DetectedAtUtc = DateTime.UtcNow,
        };
        repository.SeedViolationEvent(violation);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new UpdateViolationStatusCommand(violation.Id, ViolationStatus.UnderInvestigation, AdminUserId));

        Assert.True(result.Success);
        Assert.Equal(ViolationStatus.UnderInvestigation, violation.Status);
        Assert.Null(violation.ResolvedAtUtc);
    }

    [Fact]
    public async Task Resolving_stamps_the_resolution_time_and_admin()
    {
        var repository = new FakeSubmissionRepository();
        var violation = new ViolationEvent
        {
            AttemptId = Guid.NewGuid(),
            Type = ProctoringViolationType.TabSwitch,
            Severity = ViolationSeverity.Medium,
            DetectedAtUtc = DateTime.UtcNow,
            Status = ViolationStatus.UnderInvestigation,
        };
        repository.SeedViolationEvent(violation);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new UpdateViolationStatusCommand(violation.Id, ViolationStatus.Resolved, AdminUserId));

        Assert.True(result.Success);
        Assert.Equal(ViolationStatus.Resolved, violation.Status);
        Assert.NotNull(violation.ResolvedAtUtc);
        Assert.Equal(AdminUserId, violation.ResolvedByAdminUserId);
    }

    [Fact]
    public async Task Reopening_a_resolved_violation_clears_the_resolution_record()
    {
        var repository = new FakeSubmissionRepository();
        var violation = new ViolationEvent
        {
            AttemptId = Guid.NewGuid(),
            Type = ProctoringViolationType.TabSwitch,
            Severity = ViolationSeverity.Medium,
            DetectedAtUtc = DateTime.UtcNow,
            Status = ViolationStatus.Resolved,
            ResolvedAtUtc = DateTime.UtcNow,
            ResolvedByAdminUserId = AdminUserId,
        };
        repository.SeedViolationEvent(violation);
        var handler = CreateHandler(repository);

        await handler.HandleAsync(new UpdateViolationStatusCommand(violation.Id, ViolationStatus.Open, AdminUserId));

        Assert.Equal(ViolationStatus.Open, violation.Status);
        Assert.Null(violation.ResolvedAtUtc);
        Assert.Null(violation.ResolvedByAdminUserId);
    }

    [Fact]
    public async Task Returns_not_found_for_an_unknown_violation()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(
            new UpdateViolationStatusCommand(Guid.NewGuid(), ViolationStatus.Resolved, AdminUserId));

        Assert.True(result.IsNotFound);
    }
}
