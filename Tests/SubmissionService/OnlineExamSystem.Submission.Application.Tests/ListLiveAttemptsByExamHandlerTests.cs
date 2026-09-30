using OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class ListLiveAttemptsByExamHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid OtherExamId = Guid.NewGuid();
    private static readonly Guid UserAId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private const string BearerToken = "test-token";

    private static ListLiveAttemptsByExamHandler CreateHandler(
        FakeSubmissionRepository repository,
        FakeExamLookupClient? examLookupClient = null) =>
        new(repository, examLookupClient ?? new FakeExamLookupClient(null));

    [Fact]
    public async Task Includes_in_progress_attempts_unlike_the_submitted_only_report()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListLiveAttemptsByExamQuery(ExamId, BearerToken));

        Assert.Single(result);
    }

    [Fact]
    public async Task Excludes_other_exams()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = OtherExamId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListLiveAttemptsByExamQuery(ExamId, BearerToken));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Returns_empty_list_when_caller_does_not_own_the_exam()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        });
        var examLookupClient = new FakeExamLookupClient(
            new ExamLookupResult(ExamId, "Published", 1, null, null, 60, Guid.NewGuid()));
        var handler = CreateHandler(repository, examLookupClient);

        var result = await handler.HandleAsync(new ListLiveAttemptsByExamQuery(ExamId, BearerToken, OwnerUserId));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Returns_attempts_when_caller_owns_the_exam()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        });
        var examLookupClient = new FakeExamLookupClient(
            new ExamLookupResult(ExamId, "Published", 1, null, null, 60, OwnerUserId));
        var handler = CreateHandler(repository, examLookupClient);

        var result = await handler.HandleAsync(new ListLiveAttemptsByExamQuery(ExamId, BearerToken, OwnerUserId));

        Assert.Single(result);
    }
}
