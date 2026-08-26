using OnlineExamSystem.Submission.Application.Attempts.CompleteSection;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class CompleteSectionHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();
    private static readonly Guid SectionId = Guid.NewGuid();

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = Guid.NewGuid(),
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    private static CompleteSectionHandler CreateHandler(FakeSubmissionRepository repository) => new(repository);

    [Fact]
    public async Task Completing_an_entered_section_marks_it_completed()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedSectionState(new AttemptSectionState
        {
            AttemptId = attempt.Id,
            SectionId = SectionId,
            EnteredAtUtc = DateTime.UtcNow.AddMinutes(-2),
            DeadlineUtc = DateTime.UtcNow.AddMinutes(8),
            IsCompleted = false,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CompleteSectionCommand(attempt.Id, SectionId, UserId));

        Assert.True(result.Success);
        Assert.True(result.State!.IsCompleted);
        Assert.NotNull(result.State.CompletedAtUtc);
    }

    [Fact]
    public async Task Completing_without_a_prior_enter_creates_an_already_completed_state()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CompleteSectionCommand(attempt.Id, SectionId, UserId));

        Assert.True(result.Success);
        Assert.True(result.State!.IsCompleted);
        Assert.Single(repository.SectionStates);
    }

    [Fact]
    public async Task Completing_an_already_completed_section_is_idempotent()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var completedAt = DateTime.UtcNow.AddMinutes(-1);
        repository.SeedSectionState(new AttemptSectionState
        {
            AttemptId = attempt.Id,
            SectionId = SectionId,
            EnteredAtUtc = DateTime.UtcNow.AddMinutes(-5),
            DeadlineUtc = DateTime.UtcNow.AddMinutes(5),
            IsCompleted = true,
            CompletedAtUtc = completedAt,
        });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CompleteSectionCommand(attempt.Id, SectionId, UserId));

        Assert.True(result.Success);
        Assert.Equal(completedAt, result.State!.CompletedAtUtc);
        Assert.Single(repository.SectionStates);
    }

    [Fact]
    public async Task Attempt_belonging_to_another_user_is_forbidden()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CompleteSectionCommand(attempt.Id, SectionId, OtherUserId));

        Assert.True(result.IsForbidden);
    }

    [Fact]
    public async Task Attempt_not_in_progress_is_rejected()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CompleteSectionCommand(attempt.Id, SectionId, UserId));

        Assert.True(result.IsNotInProgress);
    }

    [Fact]
    public async Task Unknown_attempt_returns_not_found()
    {
        var repository = new FakeSubmissionRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new CompleteSectionCommand(Guid.NewGuid(), SectionId, UserId));

        Assert.True(result.IsAttemptNotFound);
    }
}
