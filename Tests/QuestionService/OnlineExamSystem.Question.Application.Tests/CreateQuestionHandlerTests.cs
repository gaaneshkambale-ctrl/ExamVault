using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Application.Tests.Fakes;
using OnlineExamSystem.Question.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class CreateQuestionHandlerTests
{
    private static CreateQuestionHandler CreateHandler(FakeQuestionRepository repository) =>
        new(repository, new CreateQuestionValidator());

    [Fact]
    public async Task Valid_command_creates_question_with_options()
    {
        var repository = new FakeQuestionRepository();
        var handler = CreateHandler(repository);
        var examId = Guid.NewGuid();
        var createdByUserId = Guid.NewGuid();
        var command = new CreateQuestionCommand(
            examId,
            "MultipleChoice",
            "What is the base class for all classes in C#?",
            1,
            "Easy",
            [
                new QuestionOptionInput("object", true),
                new QuestionOptionInput("System.Object", false),
            ],
            createdByUserId);

        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.Equal(examId, result.Question!.ExamId);
        Assert.Equal(QuestionType.MultipleChoice, result.Question!.QuestionType);
        Assert.Equal(QuestionDifficulty.Easy, result.Question!.Difficulty);
        Assert.Equal(createdByUserId, result.Question!.CreatedByUserId);
        Assert.Equal(2, result.Options.Count);
        Assert.Single(repository.Questions);
        Assert.Equal(2, repository.Options.Count);
        Assert.All(repository.Options, o => Assert.Equal(result.Question!.Id, o.QuestionId));
    }

    [Fact]
    public async Task Options_get_sequential_display_order()
    {
        var repository = new FakeQuestionRepository();
        var handler = CreateHandler(repository);
        var command = new CreateQuestionCommand(
            Guid.NewGuid(),
            "MultipleChoice",
            "Which keyword is used to inherit a class in C#?",
            1,
            "Easy",
            [
                new QuestionOptionInput("extends", false),
                new QuestionOptionInput(":", true),
                new QuestionOptionInput("implements", false),
            ],
            Guid.NewGuid());

        var result = await handler.HandleAsync(command);

        Assert.Equal([0, 1, 2], result.Options.Select(o => o.DisplayOrder));
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_saving()
    {
        var repository = new FakeQuestionRepository();
        var handler = CreateHandler(repository);
        var command = new CreateQuestionCommand(
            Guid.NewGuid(),
            "MultipleChoice",
            "",
            1,
            "Easy",
            [new QuestionOptionInput("object", true)],
            Guid.NewGuid());

        var result = await handler.HandleAsync(command);

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(repository.Questions);
        Assert.Empty(repository.Options);
    }
}
