using OnlineExamSystem.Exam.Application.Exams.GetById;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class GetExamHandlerTests
{
    private static readonly Guid StudentId = Guid.NewGuid();

    [Fact]
    public async Task Admin_can_see_any_exam_regardless_of_status_or_assignment()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "Draft Exam", Status = ExamStatus.Draft };
        await repository.AddAsync(exam);
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(exam.Id, Guid.NewGuid(), IsAdmin: true));

        Assert.NotNull(result);
        Assert.Equal("Draft Exam", result!.Title);
    }

    [Fact]
    public async Task Unknown_id_returns_null()
    {
        var repository = new FakeExamRepository();
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(Guid.NewGuid(), Guid.NewGuid(), IsAdmin: true));

        Assert.Null(result);
    }

    [Fact]
    public async Task Student_can_see_published_exam_they_are_assigned_to()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        repository.SeedAssignment(new ExamAssignment { ExamId = exam.Id }, [StudentId]);
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(exam.Id, StudentId, IsAdmin: false));

        Assert.NotNull(result);
        Assert.Equal("C# Fundamentals", result!.Title);
    }

    [Fact]
    public async Task Student_cannot_see_published_exam_they_are_not_assigned_to()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Published };
        await repository.AddAsync(exam);
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(exam.Id, StudentId, IsAdmin: false));

        Assert.Null(result);
    }

    [Fact]
    public async Task Student_cannot_see_draft_exam_even_if_assigned()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Draft };
        await repository.AddAsync(exam);
        repository.SeedAssignment(new ExamAssignment { ExamId = exam.Id }, [StudentId]);
        var handler = new GetExamHandler(repository);

        var result = await handler.HandleAsync(new GetExamQuery(exam.Id, StudentId, IsAdmin: false));

        Assert.Null(result);
    }
}
