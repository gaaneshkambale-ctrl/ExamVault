using OnlineExamSystem.Exam.Application.Exams.GetById;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class GetExamHandlerTests
{
    [Fact]
    public async Task Existing_exam_is_returned()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals" };
        await repository.AddAsync(exam);
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(exam.Id));

        Assert.NotNull(result);
        Assert.Equal("C# Fundamentals", result!.Title);
    }

    [Fact]
    public async Task Unknown_id_returns_null()
    {
        var repository = new FakeExamRepository();
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(Guid.NewGuid()));

        Assert.Null(result);
    }
}
