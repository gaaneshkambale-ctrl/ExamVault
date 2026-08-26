using OnlineExamSystem.Exam.Application.Sections.Update;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class UpdateSectionHandlerTests
{
    private static UpdateSectionHandler CreateHandler(FakeExamRepository repository) =>
        new(repository, new UpdateSectionValidator());

    [Fact]
    public async Task Existing_section_is_updated()
    {
        var repository = new FakeExamRepository();
        var examId = Guid.NewGuid();
        var section = new Section { ExamId = examId, Name = "Old Name", NavigationType = NavigationType.Free };
        await repository.AddSectionAsync(section);
        var handler = CreateHandler(repository);
        var command = new UpdateSectionCommand(
            section.Id,
            "New Name",
            "New description",
            "",
            1,
            15,
            15,
            20,
            "Locked",
            true,
            1,
            false,
            false,
            false);

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.Equal("New Name", result.Section!.Name);
        Assert.Equal(NavigationType.Locked, result.Section!.NavigationType);
        Assert.True(result.Section!.NegativeMarkingEnabled);
    }

    [Fact]
    public async Task Unknown_section_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = CreateHandler(repository);
        var command = new UpdateSectionCommand(
            Guid.NewGuid(), "Name", "", "", 0, 10, 10, 15, "Free", false, 0, true, true, true);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
