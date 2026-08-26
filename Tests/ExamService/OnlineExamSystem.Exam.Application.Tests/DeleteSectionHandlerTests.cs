using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Exam.Application.Sections.Delete;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class DeleteSectionHandlerTests
{
    [Fact]
    public async Task Existing_section_is_removed_and_its_questions_are_unassigned()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient();
        var section = new Section { ExamId = Guid.NewGuid(), Name = "To delete" };
        await repository.AddSectionAsync(section);
        var handler = new DeleteSectionHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteSectionHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteSectionCommand(section.Id, "token"));

        Assert.False(result.IsNotFound);
        Assert.Empty(repository.Sections);
        Assert.Contains(section.Id, questionServiceClient.UnassignedSectionIds);
    }

    [Fact]
    public async Task Unknown_section_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient();
        var handler = new DeleteSectionHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteSectionHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteSectionCommand(Guid.NewGuid(), "token"));

        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Question_service_failure_does_not_fail_the_delete()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient { ThrowOnUnassign = true };
        var section = new Section { ExamId = Guid.NewGuid(), Name = "To delete" };
        await repository.AddSectionAsync(section);
        var handler = new DeleteSectionHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteSectionHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteSectionCommand(section.Id, "token"));

        Assert.False(result.IsNotFound);
        Assert.Empty(repository.Sections);
    }
}
