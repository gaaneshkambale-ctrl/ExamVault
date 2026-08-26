using OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class ForceSubmitAttemptHandlerTests
{
    private static readonly Guid AdminUserId = Guid.NewGuid();

    private static ForceSubmitAttemptHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    [Fact]
    public async Task Ends_an_in_progress_attempt_as_auto_submitted()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = new ExamAttempt
        {
            ExamId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow.AddMinutes(-10),
            Status = AttemptStatus.InProgress,
        };
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ForceSubmitAttemptCommand(attempt.Id, AdminUserId));

        Assert.True(result.Success);
        Assert.Equal(AttemptStatus.AutoSubmitted, attempt.Status);
        Assert.NotNull(attempt.SubmittedAtUtc);
    }

    [Fact]
    public async Task Works_regardless_of_who_owns_the_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = new ExamAttempt
        {
            ExamId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.InProgress,
        };
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ForceSubmitAttemptCommand(attempt.Id, AdminUserId));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Returns_already_submitted_for_a_non_in_progress_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = new ExamAttempt
        {
            ExamId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            AttemptNumber = 1,
            StartedAtUtc = DateTime.UtcNow,
            Status = AttemptStatus.Submitted,
        };
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ForceSubmitAttemptCommand(attempt.Id, AdminUserId));

        Assert.True(result.IsAlreadySubmitted);
    }

    [Fact]
    public async Task Returns_not_found_for_an_unknown_attempt()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ForceSubmitAttemptCommand(Guid.NewGuid(), AdminUserId));

        Assert.True(result.IsAttemptNotFound);
    }
}
