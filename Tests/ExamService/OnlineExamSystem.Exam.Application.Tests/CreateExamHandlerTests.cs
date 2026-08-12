using OnlineExamSystem.Exam.Application.Exams.Create;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateExamHandlerTests
{
    private static CreateExamHandler CreateHandler(FakeExamRepository repository) =>
        new(repository, new CreateExamValidator());

    [Fact]
    public async Task Valid_command_creates_a_draft_exam()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var createdByUserId = Guid.NewGuid();
        var command = new CreateExamCommand(
            "C# Fundamentals",
            "Covers the basics of C#.",
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
        Assert.Equal(ExamType.Manual, result.Exam!.ExamType);
        Assert.Equal(ExamStatus.Draft, result.Exam!.Status);
        Assert.Equal(createdByUserId, result.Exam!.CreatedByUserId);
        Assert.Single(repository.Exams);
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_saving()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var command = new CreateExamCommand("", "", "Manual", 0, 0, 0, "", Guid.NewGuid());

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(repository.Exams);
    }
}
