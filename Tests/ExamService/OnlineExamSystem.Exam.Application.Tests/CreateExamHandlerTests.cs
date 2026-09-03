using OnlineExamSystem.Exam.Application.Exams.Create;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateExamHandlerTests
{
    private static CreateExamHandler CreateHandler(
        FakeExamRepository repository,
        FakeTenantLimitsClient? tenantLimitsClient = null,
        FakeCurrentTenant? currentTenant = null) =>
        new(
            repository,
            new CreateExamValidator(),
            tenantLimitsClient ?? new FakeTenantLimitsClient(),
            // Defaults to Super Admin so existing tests (none of which care
            // about quota enforcement) skip that check entirely, same as a
            // real Super Admin caller would.
            currentTenant ?? new FakeCurrentTenant { IsSuperAdmin = true });

    [Fact]
    public async Task Valid_command_creates_a_draft_exam()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var createdByUserId = Guid.NewGuid();
        var command = new CreateExamCommand(
            "C# Fundamentals",
            "Covers the basics of C#.",
            "Technical",
            false,
            "Manual",
            60,
            50,
            25,
            "Answer all questions.",
            createdByUserId);

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.NotNull(result.Exam);
        Assert.Equal("C# Fundamentals", result.Exam!.Title);
        Assert.Equal(CreationMethod.Manual, result.Exam!.CreationMethod);
        Assert.Equal(ExamStatus.Draft, result.Exam!.Status);
        Assert.Equal(createdByUserId, result.Exam!.CreatedByUserId);
        Assert.Single(repository.Exams);
    }

    [Fact]
    public async Task ExamCode_is_auto_generated_from_category_and_year()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var command = new CreateExamCommand(
            "C# Fundamentals",
            "Covers the basics of C#.",
            "Technical",
            false,
            "Manual",
            60,
            50,
            25,
            "Answer all questions.",
            Guid.NewGuid());

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.Matches($@"^TEC-{DateTime.UtcNow.Year}-[0-9A-F]{{6}}$", result.Exam!.ExamCode);
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_saving()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var command = new CreateExamCommand("", "", "", false, "Manual", 0, 0, 0, "", Guid.NewGuid());

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(repository.Exams);
    }

    [Fact]
    public async Task Exam_creation_is_rejected_once_the_tenant_reaches_its_max_exams_limit()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeExamRepository();
        var tenantLimitsClient = new FakeTenantLimitsClient { Limits = new OnlineExamSystem.Exam.Application.Interfaces.TenantLimits(null, 1, null) };
        var currentTenant = new FakeCurrentTenant { TenantId = tenantId, IsSuperAdmin = false };
        var handler = CreateHandler(repository, tenantLimitsClient, currentTenant);
        var command = new CreateExamCommand(
            "First Exam", "Description", "Technical", false, "Manual", 60, 50, 25, "Instructions", Guid.NewGuid());

        var first = await handler.HandleAsync(command);
        Assert.True(first.Success);
        repository.Exams.First().TenantId = tenantId;

        var second = await handler.HandleAsync(command with { Title = "Second Exam" });

        Assert.False(second.Success);
        Assert.Contains(second.ValidationErrors, e => e.Contains("limit"));
    }

    [Fact]
    public async Task Exam_creation_is_unaffected_when_no_limit_is_configured()
    {
        var repository = new FakeExamRepository();
        var tenantLimitsClient = new FakeTenantLimitsClient { Limits = new OnlineExamSystem.Exam.Application.Interfaces.TenantLimits(null, null, null) };
        var currentTenant = new FakeCurrentTenant { IsSuperAdmin = false };
        var handler = CreateHandler(repository, tenantLimitsClient, currentTenant);
        var command = new CreateExamCommand(
            "An Exam", "Description", "Technical", false, "Manual", 60, 50, 25, "Instructions", Guid.NewGuid());

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
    }
}
