using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.Update;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class UpdateQuestionValidatorTests
{
    private readonly UpdateQuestionValidator _validator = new();

    private static UpdateQuestionCommand ValidCommand() =>
        new(
            Guid.NewGuid(),
            "MultipleChoice",
            "What is the base class for all classes in C#?",
            1,
            "Easy",
            [
                new QuestionOptionInput("object", true),
                new QuestionOptionInput("System.Object", false),
            ]);

    [Fact]
    public void Valid_command_passes()
    {
        var result = _validator.Validate(ValidCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_question_id_fails()
    {
        var command = ValidCommand() with { QuestionId = Guid.Empty };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Unsupported_question_type_fails()
    {
        var command = ValidCommand() with { QuestionType = "Essay" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Zero_correct_options_fails()
    {
        var command = ValidCommand() with
        {
            Options =
            [
                new QuestionOptionInput("object", false),
                new QuestionOptionInput("System.Object", false),
            ],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void True_false_with_wrong_option_count_fails()
    {
        var command = ValidCommand() with
        {
            QuestionType = "TrueFalse",
            Options =
            [
                new QuestionOptionInput("True", true),
                new QuestionOptionInput("False", false),
                new QuestionOptionInput("Maybe", false),
            ],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
