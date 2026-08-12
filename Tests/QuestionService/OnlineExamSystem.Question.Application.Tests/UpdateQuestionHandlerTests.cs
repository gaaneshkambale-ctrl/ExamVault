using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.Update;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Question.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class UpdateQuestionHandlerTests
{
    private static UpdateQuestionHandler CreateHandler(FakeQuestionRepository repository) =>
        new(repository, new UpdateQuestionValidator());

    [Fact]
    public async Task Valid_command_replaces_text_and_options()
    {
        var repository = new FakeQuestionRepository();
        var question = new ExamQuestion { QuestionText = "Old text", Marks = 1 };
        var oldOptions = new List<QuestionOption>
        {
            new() { QuestionId = question.Id, OptionText = "A", IsCorrect = true, DisplayOrder = 0 },
            new() { QuestionId = question.Id, OptionText = "B", IsCorrect = false, DisplayOrder = 1 },
        };
        await repository.AddAsync(question, oldOptions);
        var handler = CreateHandler(repository);

        var command = new UpdateQuestionCommand(
            question.Id,
            "MultipleChoice",
            "New text",
            5,
            "Hard",
            [
                new QuestionOptionInput("X", false),
                new QuestionOptionInput("Y", true),
                new QuestionOptionInput("Z", false),
            ]);

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.Equal("New text", result.Question!.QuestionText);
        Assert.Equal(5, result.Question!.Marks);
        Assert.Equal(QuestionDifficulty.Hard, result.Question!.Difficulty);
        Assert.Equal(3, result.Options.Count);
        Assert.DoesNotContain(repository.Options, o => o.OptionText is "A" or "B");
    }

    [Fact]
    public async Task Unknown_question_returns_not_found()
    {
        var repository = new FakeQuestionRepository();
        var handler = CreateHandler(repository);
        var command = new UpdateQuestionCommand(
            Guid.NewGuid(),
            "MultipleChoice",
            "Text",
            1,
            "Easy",
            [new QuestionOptionInput("A", true), new QuestionOptionInput("B", false)]);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }

    [Fact]
    public async Task Invalid_command_leaves_existing_options_untouched()
    {
        var repository = new FakeQuestionRepository();
        var question = new ExamQuestion { QuestionText = "Old text" };
        var oldOptions = new List<QuestionOption>
        {
            new() { QuestionId = question.Id, OptionText = "A", IsCorrect = true, DisplayOrder = 0 },
        };
        await repository.AddAsync(question, oldOptions);
        var handler = CreateHandler(repository);

        var command = new UpdateQuestionCommand(question.Id, "MultipleChoice", "", 1, "Easy", []);

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Equal("Old text", question.QuestionText);
        Assert.Single(repository.Options);
    }
}
