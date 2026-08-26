using OnlineExamSystem.Submission.Application.Attempts.ListByUser;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class ListAttemptsByUserHandlerTests
{
    private static readonly Guid UserAId = Guid.NewGuid();
    private static readonly Guid UserBId = Guid.NewGuid();
    private static readonly Guid ExamAId = Guid.NewGuid();
    private static readonly Guid ExamBId = Guid.NewGuid();

    private static ListAttemptsByUserHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    [Fact]
    public async Task Returns_all_of_the_users_attempts_across_exams_newest_first()
    {
        var repository = new FakeSubmissionRepository();
        var older = new ExamAttempt
        {
            ExamId = ExamAId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddDays(-2),
            SubmittedAtUtc = DateTime.UtcNow.AddDays(-2).AddMinutes(30),
            Status = AttemptStatus.Submitted,
        };
        var newer = new ExamAttempt
        {
            ExamId = ExamBId,
            UserId = UserAId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddDays(-1),
            Status = AttemptStatus.InProgress,
        };
        repository.SeedAttempt(older);
        repository.SeedAttempt(newer);
        repository.SeedAttempt(new ExamAttempt
        {
            ExamId = ExamAId,
            UserId = UserBId,
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListAttemptsByUserQuery(UserAId));

        Assert.Equal(2, result.Count);
        Assert.Equal(newer.Id, result[0].Id);
        Assert.Equal(older.Id, result[1].Id);
    }

    [Fact]
    public async Task Returns_empty_list_when_user_has_no_attempts()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ListAttemptsByUserQuery(Guid.NewGuid()));

        Assert.Empty(result);
    }
}
