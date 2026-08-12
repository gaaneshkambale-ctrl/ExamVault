using OnlineExamSystem.Question.Application.Questions;
using OnlineExamSystem.Question.Application.Questions.Create;
using Xunit;

namespace OnlineExamSystem.Question.Application.Tests;

public class CreateQuestionValidatorTests
{
    private readonly CreateQuestionValidator _validator = new();

    private static CreateQuestionCommand ValidMultipleChoiceCommand() =>
        new(
            Guid.NewGuid(),
            "MultipleChoice",
            "What is the base class for all classes in C#?",
            1,
            "Easy",
            [
                new QuestionOptionInput("object", true),
                new QuestionOptionInput("System.Object", false),
                new QuestionOptionInput("BaseClass", false),
            ],
            Guid.NewGuid());

    private static CreateQuestionCommand ValidTrueFalseCommand() =>
        new(
            Guid.NewGuid(),
            "TrueFalse",
            "ASP.NET Core middleware runs in the order it is registered.",
            1,
            "Medium",
            [
                new QuestionOptionInput("True", true),
                new QuestionOptionInput("False", false),
            ],
            Guid.NewGuid());

    [Fact]
    public void Valid_multiple_choice_command_passes()
    {
        var result = _validator.Validate(ValidMultipleChoiceCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Valid_true_false_command_passes()
    {
        var result = _validator.Validate(ValidTrueFalseCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Unsupported_question_type_fails()
    {
        var command = ValidMultipleChoiceCommand() with { QuestionType = "Essay" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Empty_question_text_fails()
    {
        var command = ValidMultipleChoiceCommand() with { QuestionText = "" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Zero_correct_options_fails()
    {
        var command = ValidMultipleChoiceCommand() with
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
    public void Two_correct_options_fails()
    {
        var command = ValidMultipleChoiceCommand() with
        {
            Options =
            [
                new QuestionOptionInput("object", true),
                new QuestionOptionInput("System.Object", true),
            ],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Multiple_choice_with_fewer_than_two_options_fails()
    {
        var command = ValidMultipleChoiceCommand() with
        {
            Options = [new QuestionOptionInput("object", true)],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void True_false_with_wrong_option_text_fails()
    {
        var command = ValidTrueFalseCommand() with
        {
            Options =
            [
                new QuestionOptionInput("Yes", true),
                new QuestionOptionInput("No", false),
            ],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void True_false_with_three_options_fails()
    {
        var command = ValidTrueFalseCommand() with
        {
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
