using OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class ListViolationsByExamHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid OtherExamId = Guid.NewGuid();
    private static readonly Guid UserAId = Guid.NewGuid();
    private static readonly Guid UserBId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private const string BearerToken = "test-token";

    private static ListViolationsByExamHandler CreateHandler(
        FakeSubmissionRepository repository,
        FakeExamLookupClient? examLookupClient = null) =>
        new(repository, examLookupClient ?? new FakeExamLookupClient(null));

    [Fact]
    public async Task Returns_events_across_every_attempt_on_the_exam_with_the_right_user_attached()
    {
        var repository = new FakeSubmissionRepository();
        var attemptA = new ExamAttempt { ExamId = ExamId, UserId = UserAId, AttemptNumber = 1, StartedAtUtc = DateTime.UtcNow, Status = AttemptStatus.InProgress };
        var attemptB = new ExamAttempt { ExamId = ExamId, UserId = UserBId, AttemptNumber = 1, StartedAtUtc = DateTime.UtcNow, Status = AttemptStatus.Submitted };
        repository.SeedAttempt(attemptA);
        repository.SeedAttempt(attemptB);
        repository.SeedViolationEvent(new ViolationEvent
        {
            AttemptId = attemptA.Id,
            Type = ProctoringViolationType.TabSwitch,
            Severity = ViolationSeverity.Medium,
            DetectedAtUtc = DateTime.UtcNow.AddMinutes(-5),
        });
        repository.SeedViolationEvent(new ViolationEvent
        {
            AttemptId = attemptB.Id,
            Type = ProctoringViolationType.MultipleFacesDetected,
            Severity = ViolationSeverity.Critical,
            DetectedAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListViolationsByExamQuery(ExamId, BearerToken));

        Assert.Equal(2, result.Count);
        Assert.Contains(result, r => r.UserId == UserAId && r.Event.Type == ProctoringViolationType.TabSwitch);
        Assert.Contains(result, r => r.UserId == UserBId && r.Event.Type == ProctoringViolationType.MultipleFacesDetected);
    }

    [Fact]
    public async Task Orders_most_recent_first()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = new ExamAttempt { ExamId = ExamId, UserId = UserAId, AttemptNumber = 1, StartedAtUtc = DateTime.UtcNow, Status = AttemptStatus.InProgress };
        repository.SeedAttempt(attempt);
        var older = new ViolationEvent { AttemptId = attempt.Id, Type = ProctoringViolationType.RightClick, Severity = ViolationSeverity.Low, DetectedAtUtc = DateTime.UtcNow.AddMinutes(-10) };
        var newer = new ViolationEvent { AttemptId = attempt.Id, Type = ProctoringViolationType.TabSwitch, Severity = ViolationSeverity.Medium, DetectedAtUtc = DateTime.UtcNow };
        repository.SeedViolationEvent(older);
        repository.SeedViolationEvent(newer);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListViolationsByExamQuery(ExamId, BearerToken));

        Assert.Equal(newer.Id, result[0].Event.Id);
        Assert.Equal(older.Id, result[1].Event.Id);
    }

    [Fact]
    public async Task Excludes_violations_from_other_exams()
    {
        var repository = new FakeSubmissionRepository();
        var otherExamAttempt = new ExamAttempt { ExamId = OtherExamId, UserId = UserAId, AttemptNumber = 1, StartedAtUtc = DateTime.UtcNow, Status = AttemptStatus.InProgress };
        repository.SeedAttempt(otherExamAttempt);
        repository.SeedViolationEvent(new ViolationEvent
        {
            AttemptId = otherExamAttempt.Id,
            Type = ProctoringViolationType.TabSwitch,
            Severity = ViolationSeverity.Medium,
            DetectedAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListViolationsByExamQuery(ExamId, BearerToken));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Returns_empty_list_when_caller_does_not_own_the_exam()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = new ExamAttempt { ExamId = ExamId, UserId = UserAId, AttemptNumber = 1, StartedAtUtc = DateTime.UtcNow, Status = AttemptStatus.InProgress };
        repository.SeedAttempt(attempt);
        repository.SeedViolationEvent(new ViolationEvent
        {
            AttemptId = attempt.Id,
            Type = ProctoringViolationType.TabSwitch,
            Severity = ViolationSeverity.Medium,
            DetectedAtUtc = DateTime.UtcNow,
        });
        var examLookupClient = new FakeExamLookupClient(
            new ExamLookupResult(ExamId, "Published", 1, null, null, 60, Guid.NewGuid()));
        var handler = CreateHandler(repository, examLookupClient);

        var result = await handler.HandleAsync(new ListViolationsByExamQuery(ExamId, BearerToken, OwnerUserId));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Returns_events_when_caller_owns_the_exam()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = new ExamAttempt { ExamId = ExamId, UserId = UserAId, AttemptNumber = 1, StartedAtUtc = DateTime.UtcNow, Status = AttemptStatus.InProgress };
        repository.SeedAttempt(attempt);
        repository.SeedViolationEvent(new ViolationEvent
        {
            AttemptId = attempt.Id,
            Type = ProctoringViolationType.TabSwitch,
            Severity = ViolationSeverity.Medium,
            DetectedAtUtc = DateTime.UtcNow,
        });
        var examLookupClient = new FakeExamLookupClient(
            new ExamLookupResult(ExamId, "Published", 1, null, null, 60, OwnerUserId));
        var handler = CreateHandler(repository, examLookupClient);

        var result = await handler.HandleAsync(new ListViolationsByExamQuery(ExamId, BearerToken, OwnerUserId));

        Assert.Single(result);
    }
}
