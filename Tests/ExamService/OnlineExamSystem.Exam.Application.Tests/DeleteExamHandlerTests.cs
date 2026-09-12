using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Exam.Application.Exams.Delete;
using OnlineExamSystem.Exam.Application.Tests.Fakes;
using OnlineExamSystem.Exam.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Exam.Application.Tests;

public class DeleteExamHandlerTests
{
    [Fact]
    public async Task Existing_exam_is_removed_and_its_questions_are_deleted()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient();
        var exam = new ExamPaper { Title = "To be deleted" };
        await repository.AddAsync(exam);
        var handler = new DeleteExamHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteExamHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteExamCommand(exam.Id, "token"));

        Assert.True(result.Success);
        Assert.Empty(repository.Exams);
        Assert.Contains(exam.Id, questionServiceClient.DeletedForExamIds);
    }

    // The deleted row is gone by the time the controller sees this result -
    // it has to carry the exam's own TenantId/Title back so ExamsController
    // can write a real "Deleted exam" audit entry (matching Create's own).
    [Fact]
    public async Task Result_carries_the_deleted_exam_s_tenant_and_title_for_auditing()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient();
        var tenantId = Guid.NewGuid();
        var exam = new ExamPaper { Title = "Audit Me", TenantId = tenantId };
        await repository.AddAsync(exam);
        var handler = new DeleteExamHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteExamHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteExamCommand(exam.Id, "token"));

        Assert.Equal(tenantId, result.TenantId);
        Assert.Equal("Audit Me", result.Title);
    }

    [Fact]
    public async Task Unknown_exam_returns_not_found()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient();
        var handler = new DeleteExamHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteExamHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteExamCommand(Guid.NewGuid(), "token"));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Question_service_failure_does_not_fail_the_delete()
    {
        var repository = new FakeExamRepository();
        var questionServiceClient = new FakeQuestionServiceClient { ThrowOnDeleteForExam = true };
        var exam = new ExamPaper { Title = "To be deleted" };
        await repository.AddAsync(exam);
        var handler = new DeleteExamHandler(
            repository,
            questionServiceClient,
            NullLogger<DeleteExamHandler>.Instance);

        var result = await handler.HandleAsync(new DeleteExamCommand(exam.Id, "token"));

        Assert.True(result.Success);
        Assert.Empty(repository.Exams);
    }
}
