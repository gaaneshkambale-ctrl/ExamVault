using OnlineExamSystem.Question.Application.Questions.Delete;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class DeleteQuestionHandlerTests
{
    [Fact]
    public async Task Existing_question_is_removed()
    {
        var repository = new FakeQuestionRepository();
        var question = new ExamQuestion { QuestionText = "To be deleted" };
        await repository.AddAsync(question, []);
        var handler = new DeleteQuestionHandler(repository);

        var result = await handler.HandleAsync(new DeleteQuestionCommand(question.Id));

        Assert.True(result.Success);
        Assert.Empty(repository.Questions);
    }

    // The deleted row is gone by the time the controller sees this result -
    // it has to carry the question's own TenantId/QuestionText back so
    // QuestionsController can write a real "Deleted question" audit entry
    // (matching Create's own).
    [Fact]
    public async Task Result_carries_the_deleted_question_s_tenant_and_text_for_auditing()
    {
        var repository = new FakeQuestionRepository();
        var tenantId = Guid.NewGuid();
        var question = new ExamQuestion { QuestionText = "Audit Me", TenantId = tenantId };
        await repository.AddAsync(question, []);
        var handler = new DeleteQuestionHandler(repository);

        var result = await handler.HandleAsync(new DeleteQuestionCommand(question.Id));

        Assert.Equal(tenantId, result.TenantId);
        Assert.Equal("Audit Me", result.QuestionText);
    }

    [Fact]
    public async Task Unknown_question_returns_not_found()
    {
        var repository = new FakeQuestionRepository();
        var handler = new DeleteQuestionHandler(repository);

        var result = await handler.HandleAsync(new DeleteQuestionCommand(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
