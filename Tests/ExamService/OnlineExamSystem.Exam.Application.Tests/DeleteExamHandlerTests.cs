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

    // The deleted row is gone by the time the controller sees this result -
    // it has to carry the exam's own TenantId/Title back so ExamsController
    // can write a real "Deleted exam" audit entry (matching Create's own).
    [Fact]
    public async Task Result_carries_the_deleted_exam_s_tenant_and_title_for_auditing()
    {
        var repository = new FakeExamRepository();
        var tenantId = Guid.NewGuid();
        var exam = new ExamPaper { Title = "Audit Me", TenantId = tenantId };
        await repository.AddAsync(exam);
        var handler = new DeleteExamHandler(repository);

        var result = await handler.HandleAsync(new DeleteExamCommand(exam.Id));

        Assert.Equal(tenantId, result.TenantId);
        Assert.Equal("Audit Me", result.Title);
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
