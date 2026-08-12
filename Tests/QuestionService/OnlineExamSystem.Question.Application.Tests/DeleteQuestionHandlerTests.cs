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
