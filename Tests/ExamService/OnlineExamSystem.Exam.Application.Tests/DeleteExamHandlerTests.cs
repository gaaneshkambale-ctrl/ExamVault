using OnlineExamSystem.Exam.Application.Exams.Delete;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class DeleteExamHandlerTests
{
    [Fact]
    public async Task Existing_exam_is_removed()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "To be deleted" };
        await repository.AddAsync(exam);
        var handler = new DeleteExamHandler(repository);

        var result = await handler.HandleAsync(new DeleteExamCommand(exam.Id));

        Assert.True(result.Success);
        Assert.Empty(repository.Exams);
    }

    [Fact]
    public async Task Unknown_exam_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = new DeleteExamHandler(repository);

        var result = await handler.HandleAsync(new DeleteExamCommand(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
