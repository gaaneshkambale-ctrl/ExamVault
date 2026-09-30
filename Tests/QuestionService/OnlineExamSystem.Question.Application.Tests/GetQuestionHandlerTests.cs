using OnlineExamSystem.Question.Application.Questions.GetById;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class GetQuestionHandlerTests
{
    [Fact]
    public async Task Existing_question_is_returned_with_its_options()
    {
        var repository = new FakeQuestionRepository();
        var question = new ExamQuestion { QuestionText = "What is LINQ?" };
        var options = new List<QuestionOption>
        {
            new() { QuestionId = question.Id, OptionText = "A", IsCorrect = true, DisplayOrder = 0 },
            new() { QuestionId = question.Id, OptionText = "B", IsCorrect = false, DisplayOrder = 1 },
        };
        await repository.AddAsync(question, options);
        var handler = new GetQuestionHandler(repository);

        var result = await handler.HandleAsync(new GetQuestionQuery(question.Id));

        Assert.NotNull(result);
        Assert.Equal("What is LINQ?", result!.Question.QuestionText);
        Assert.Equal(2, result.Options.Count);
    }

    [Fact]
    public async Task Unknown_id_returns_null()
    {
        var repository = new FakeQuestionRepository();
        var handler = new GetQuestionHandler(repository);

        var result = await handler.HandleAsync(new GetQuestionQuery(Guid.NewGuid()));

        Assert.Null(result);
    }

    [Fact]
    public async Task Owner_can_see_their_own_question()
    {
        var ownerId = Guid.NewGuid();
        var repository = new FakeQuestionRepository();
        var question = new ExamQuestion { QuestionText = "What is LINQ?", CreatedByUserId = ownerId };
        await repository.AddAsync(question, []);
        var handler = new GetQuestionHandler(repository);

        var result = await handler.HandleAsync(new GetQuestionQuery(question.Id, ownerId));

        Assert.NotNull(result);
    }

    [Fact]
    public async Task Non_owner_cannot_see_another_instructors_question()
    {
        var repository = new FakeQuestionRepository();
        var question = new ExamQuestion { QuestionText = "What is LINQ?", CreatedByUserId = Guid.NewGuid() };
        await repository.AddAsync(question, []);
        var handler = new GetQuestionHandler(repository);

        var result = await handler.HandleAsync(new GetQuestionQuery(question.Id, Guid.NewGuid()));

        Assert.Null(result);
    }
}
