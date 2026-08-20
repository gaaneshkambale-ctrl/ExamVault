using OnlineExamSystem.Submission.Application.Attempts.EnterSection;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Application.Tests.Fakes;
using OnlineExamSystem.Submission.Domain.Entities;
using OnlineExamSystem.Submission.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Submission.Application.Tests;

public class EnterSectionHandlerTests
{
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();
    private static readonly Guid ExamId = Guid.NewGuid();
    private static readonly Guid Section1Id = Guid.NewGuid();
    private static readonly Guid Section2Id = Guid.NewGuid();

    private static ExamAttempt InProgressAttempt() => new()
    {
        ExamId = ExamId,
        UserId = UserId,
        AttemptNumber = 1,
        StartedAtUtc = DateTime.UtcNow,
        Status = AttemptStatus.InProgress,
    };

    private static EnterSectionHandler CreateHandler(
        FakeSubmissionRepository repository,
        IReadOnlyList<SectionLookupResult> sections) =>
        new(repository, new FakeExamLookupClient(result: null, sections: sections));

    [Fact]
    public async Task Entering_a_section_for_the_first_time_creates_state_with_deadline()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Free", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));

        Assert.True(result.Success);
        Assert.False(result.State!.IsCompleted);
        Assert.True(result.State.DeadlineUtc > result.State.EnteredAtUtc);
        Assert.Single(repository.SectionStates);
    }

    [Fact]
    public async Task Re_entering_an_in_progress_section_returns_the_same_state()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Free", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var first = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));
        var second = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));

        Assert.Equal(first.State!.Id, second.State!.Id);
        Assert.Equal(first.State.DeadlineUtc, second.State.DeadlineUtc);
        Assert.Single(repository.SectionStates);
    }

    [Fact]
    public async Task Sequential_section_blocks_a_later_section_until_completed()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Sequential", false, 0, true, true, true),
            new SectionLookupResult(Section2Id, "Section 2", 1, 10, "Free", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section2Id, UserId, "token"));

        Assert.False(result.Success);
        Assert.True(result.IsSectionLocked);
    }

    [Fact]
    public async Task Later_section_opens_once_the_earlier_sequential_section_is_completed()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedSectionState(new AttemptSectionState
        {
            AttemptId = attempt.Id,
            SectionId = Section1Id,
            EnteredAtUtc = DateTime.UtcNow.AddMinutes(-5),
            DeadlineUtc = DateTime.UtcNow.AddMinutes(5),
            IsCompleted = true,
            CompletedAtUtc = DateTime.UtcNow,
        });
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Sequential", false, 0, true, true, true),
            new SectionLookupResult(Section2Id, "Section 2", 1, 10, "Free", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section2Id, UserId, "token"));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Free_earlier_sections_never_block_a_later_section()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Free", false, 0, true, true, true),
            new SectionLookupResult(Section2Id, "Section 2", 1, 10, "Free", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section2Id, UserId, "token"));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Completed_locked_section_cannot_be_re_entered()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedSectionState(new AttemptSectionState
        {
            AttemptId = attempt.Id,
            SectionId = Section1Id,
            EnteredAtUtc = DateTime.UtcNow.AddMinutes(-5),
            DeadlineUtc = DateTime.UtcNow.AddMinutes(5),
            IsCompleted = true,
            CompletedAtUtc = DateTime.UtcNow,
        });
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Locked", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));

        Assert.False(result.Success);
        Assert.True(result.IsSectionLocked);
    }

    [Fact]
    public async Task Completed_free_section_can_still_be_re_entered()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        repository.SeedSectionState(new AttemptSectionState
        {
            AttemptId = attempt.Id,
            SectionId = Section1Id,
            EnteredAtUtc = DateTime.UtcNow.AddMinutes(-5),
            DeadlineUtc = DateTime.UtcNow.AddMinutes(5),
            IsCompleted = true,
            CompletedAtUtc = DateTime.UtcNow,
        });
        var sections = new[]
        {
            new SectionLookupResult(Section1Id, "Section 1", 0, 10, "Free", false, 0, true, true, true),
        };
        var handler = CreateHandler(repository, sections);

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Unknown_section_returns_not_found()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository, Array.Empty<SectionLookupResult>());

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));

        Assert.True(result.IsSectionNotFound);
    }

    [Fact]
    public async Task Attempt_belonging_to_another_user_is_forbidden()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository, Array.Empty<SectionLookupResult>());

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, OtherUserId, "token"));

        Assert.True(result.IsForbidden);
    }

    [Fact]
    public async Task Attempt_not_in_progress_is_rejected()
    {
        var repository = new FakeSubmissionRepository();
        var attempt = InProgressAttempt();
        attempt.Status = AttemptStatus.Submitted;
        repository.SeedAttempt(attempt);
        var handler = CreateHandler(repository, Array.Empty<SectionLookupResult>());

        var result = await handler.HandleAsync(new EnterSectionCommand(attempt.Id, Section1Id, UserId, "token"));

        Assert.True(result.IsNotInProgress);
    }
}
