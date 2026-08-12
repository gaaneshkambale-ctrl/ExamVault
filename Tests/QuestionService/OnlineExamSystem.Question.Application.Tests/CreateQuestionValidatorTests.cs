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
                new CreateQuestionOptionInput("object", true),
                new CreateQuestionOptionInput("System.Object", false),
                new CreateQuestionOptionInput("BaseClass", false),
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
                new CreateQuestionOptionInput("True", true),
                new CreateQuestionOptionInput("False", false),
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
                new CreateQuestionOptionInput("object", false),
                new CreateQuestionOptionInput("System.Object", false),
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
                new CreateQuestionOptionInput("object", true),
                new CreateQuestionOptionInput("System.Object", true),
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
            Options = [new CreateQuestionOptionInput("object", true)],
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
                new CreateQuestionOptionInput("Yes", true),
                new CreateQuestionOptionInput("No", false),
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
                new CreateQuestionOptionInput("True", true),
                new CreateQuestionOptionInput("False", false),
                new CreateQuestionOptionInput("Maybe", false),
            ],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
