using OnlineExamSystem.Submission.Application.Attempts.Mine;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class GetMyAttemptHandlerTests
{
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    private static GetMyAttemptHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    [Fact]
    public async Task Returns_most_recent_attempt_with_its_answers()
    {
        var repository = new FakeSubmissionRepository();
        var firstAttempt = new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddDays(-1),
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-1),
            Status = AttemptStatus.Submitted,
        };
        var secondAttempt = new ExamAttempt
        {
            ExamId = ExamId,
            UserId = UserId,
            AttemptNumber = 2,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        };
        repository.SeedAttempt(firstAttempt);
        repository.SeedAttempt(secondAttempt);
        repository.SeedAnswer(new AttemptAnswer
        {
            AttemptId = secondAttempt.Id,
            QuestionId = Guid.NewGuid(),
            SelectedOptionId = Guid.NewGuid(),
            AnsweredAtUtc = DateTime.UtcNow,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GetMyAttemptQuery(ExamId, UserId));

        Assert.NotNull(result.Attempt);
        Assert.Equal(secondAttempt.Id, result.Attempt!.Id);
        Assert.Single(result.Answers);
    }

    [Fact]
    public async Task Returns_not_found_when_no_attempt_exists()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GetMyAttemptQuery(ExamId, UserId));

        Assert.Null(result.Attempt);
        Assert.Empty(result.Answers);
    }

    [Fact]
    public async Task Does_not_return_another_users_attempt()
    {
        var repository = new FakeSubmissionRepository();
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = ExamId,
            UserId = OtherUserId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new GetMyAttemptQuery(ExamId, UserId));

        Assert.Null(result.Attempt);
    }
}
