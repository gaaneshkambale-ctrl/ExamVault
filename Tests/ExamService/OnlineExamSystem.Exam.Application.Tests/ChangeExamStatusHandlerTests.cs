using OnlineExamSystem.Exam.Application.Exams.ChangeStatus;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class ChangeExamStatusHandlerTests
{
    [Fact]
    public async Task Draft_to_published_succeeds()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Draft };
        await repository.AddAsync(exam);
        var handler = new ChangeExamStatusHandler(repository);

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.True(result.Success);
        Assert.Equal(ExamStatus.Published, result.Exam!.Status);
    }

    [Fact]
    public async Task Archived_to_published_is_rejected()
    {
        var repository = new FakeExamRepository();
        var exam = new ExamPaper { Title = "C# Fundamentals", Status = ExamStatus.Archived };
        await repository.AddAsync(exam);
        var handler = new ChangeExamStatusHandler(repository);

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(exam.Id, ExamStatus.Published));

        Assert.False(result.Success);
        Assert.True(result.InvalidTransition);
        Assert.Equal(ExamStatus.Archived, exam.Status);
    }

    [Fact]
    public async Task Unknown_exam_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var handler = new ChangeExamStatusHandler(repository);

        var result = await handler.HandleAsync(new ChangeExamStatusCommand(Guid.NewGuid(), ExamStatus.Published));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
