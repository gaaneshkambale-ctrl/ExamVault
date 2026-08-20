using OnlineExamSystem.Exam.Application.Sections.Create;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class CreateSectionHandlerTests
{
    private static CreateSectionHandler CreateHandler(FakeExamRepository repository) =>
        new(repository, new CreateSectionValidator());

    [Fact]
    public async Task Valid_command_creates_a_section_for_an_existing_exam()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "Java Fundamentals" };
        await repository.AddAsync(exam);
        var handler = CreateHandler(repository);
        var command = new CreateSectionCommand(
            exam.Id,
            "Core Java",
            "Basics",
            "Read carefully.",
            0,
            10,
            10,
            15,
            "Sequential",
            true,
            0.5m,
            true,
            true,
            true);

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.NotNull(result.Section);
        Assert.Equal(exam.Id, result.Section!.ExamId);
        Assert.Equal(NavigationType.Sequential, result.Section!.NavigationType);
        Assert.Single(repository.Sections);
    }

    [Fact]
    public async Task Unknown_exam_returns_exam_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var command = new CreateSectionCommand(
            Guid.NewGuid(),
            "Core Java",
            "",
            "",
            0,
            10,
            10,
            15,
            "Free",
            false,
            0,
            true,
            true,
            true);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.IsExamNotFound);
        Assert.Empty(repository.Sections);
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_saving()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var command = new CreateSectionCommand(
            Guid.NewGuid(), "", "", "", 0, 0, 0, 0, "Free", false, 0, true, true, true);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(repository.Sections);
    }
}
