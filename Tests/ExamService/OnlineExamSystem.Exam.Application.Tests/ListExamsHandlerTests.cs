using OnlineExamSystem.Exam.Application.Exams.List;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class ListExamsHandlerTests
{
    [Fact]
    public async Task Returns_all_exams_newest_first()
    {
        var repository = new FakeExamRepository();
        var older = new ExamPaper { Title = "Older Exam", CreatedAtUtc = DateTime.UtcNow.AddMinutes(-10) };
        var newer = new ExamPaper { Title = "Newer Exam", CreatedAtUtc = DateTime.UtcNow };
        await repository.AddAsync(older);
        await repository.AddAsync(newer);
        var handler = new ListExamsHandler(repository);

        var result = await handler.HandleAsync(new ListExamsQuery());

        Assert.Equal(2, result.Count);
        Assert.Equal("Newer Exam", result[0].Title);
        Assert.Equal("Older Exam", result[1].Title);
    }

    [Fact]
    public async Task Empty_repository_returns_empty_list()
    {
        var repository = new FakeExamRepository();
        var handler = new ListExamsHandler(repository);

        var result = await handler.HandleAsync(new ListExamsQuery());

        Assert.Empty(result);
    }
}
