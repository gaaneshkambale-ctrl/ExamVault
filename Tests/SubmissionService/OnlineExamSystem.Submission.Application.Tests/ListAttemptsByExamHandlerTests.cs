using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class ListAttemptsByExamHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid OtherExamId = Guid.NewGuid();
    private static readonly Guid UserAId = Guid.NewGuid();
    private static readonly Guid UserBId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private const string BearerToken = "test-token";

    private static ListAttemptsByExamHandler CreateHandler(
        FakeSubmissionRepository repository,
        FakeExamLookupClient? examLookupClient = null) =>
        new(repository, examLookupClient ?? new FakeExamLookupClient(null));

    [Fact]
    public async Task Returns_submitted_and_auto_submitted_attempts_across_users_with_their_answers()
    {
        var repository = new FakeSubmissionRepository();
        var attemptA = new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-30),
            SubmittedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.Submitted,
        };
        var attemptB = new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserBId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-30),
            SubmittedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.AutoSubmitted,
        };
        repository.SeedAttempt(attemptA);
        repository.SeedAttempt(attemptB);
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = attemptA.Id,
            QuestionId = Guid.NewGuid(),
            SelectedOptionId = Guid.NewGuid(),
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListAttemptsByExamQuery(ExamId, BearerToken));

        Assert.Equal(2, result.Count);
        var resultA = result.Single(r => r.Attempt.Id == attemptA.Id);
        Assert.Single(resultA.Answers);
        var resultB = result.Single(r => r.Attempt.Id == attemptB.Id);
        Assert.Empty(resultB.Answers);
    }

    [Fact]
    public async Task Excludes_in_progress_attempts_and_other_exams()
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
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = OtherExamId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            SubmittedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.Submitted,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListAttemptsByExamQuery(ExamId, BearerToken));

        Assert.Empty(result);
    }

    [Fact]
    public async Task Returns_empty_list_when_exam_has_no_attempts()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListAttemptsByExamQuery(ExamId, BearerToken));

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
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-30),
            SubmittedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.Submitted,
        });
        var examLookupClient = new FakeExamLookupClient(
            new ExamLookupResult(ExamId, "Published", 1, null, null, 60, Guid.NewGuid()));
        var handler = CreateHandler(repository, examLookupClient);

        var result = await handler.HandleAsync(new ListAttemptsByExamQuery(ExamId, BearerToken, OwnerUserId));

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
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-30),
            SubmittedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.Submitted,
        });
        var examLookupClient = new FakeExamLookupClient(
            new ExamLookupResult(ExamId, "Published", 1, null, null, 60, OwnerUserId));
        var handler = CreateHandler(repository, examLookupClient);

        var result = await handler.HandleAsync(new ListAttemptsByExamQuery(ExamId, BearerToken, OwnerUserId));

        Assert.Single(result);
    }
}
