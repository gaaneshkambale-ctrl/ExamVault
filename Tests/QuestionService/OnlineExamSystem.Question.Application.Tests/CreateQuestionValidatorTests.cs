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

    private static CreateQuestionCommand ValidCodeProgramCommand() =>
        new(
            Guid.NewGuid(),
            "CodeProgram",
            "Write a method that reverses a string.",
            5,
            "Medium",
            [],
            Guid.NewGuid(),
            ProgrammingLanguage: "CSharp");

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

    [Fact]
    public void Valid_code_program_command_passes()
    {
        var result = _validator.Validate(ValidCodeProgramCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Code_program_with_options_fails()
    {
        var command = ValidCodeProgramCommand() with
        {
            Options = [new QuestionOptionInput("object", true)],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Code_program_without_programming_language_fails()
    {
        var command = ValidCodeProgramCommand() with { ProgrammingLanguage = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Code_program_with_unsupported_language_fails()
    {
        var command = ValidCodeProgramCommand() with { ProgrammingLanguage = "Ruby" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    private static CreateQuestionCommand ValidCodeProgramWithSignatureCommand() =>
        ValidCodeProgramCommand() with
        {
            FunctionName = "secondLargest",
            ReturnType = "Int",
            Parameters = [new QuestionParameterInput("arr", "IntArray")],
            TestCases = [new QuestionTestCaseInput(["[12,35,1,10,34,1]"], "34")],
        };

    [Fact]
    public void Valid_code_program_with_function_signature_passes()
    {
        var result = _validator.Validate(ValidCodeProgramWithSignatureCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Function_name_without_return_type_fails()
    {
        var command = ValidCodeProgramWithSignatureCommand() with { ReturnType = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Function_name_without_parameters_fails()
    {
        var command = ValidCodeProgramWithSignatureCommand() with { Parameters = [] };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Parameter_with_unsupported_type_fails()
    {
        var command = ValidCodeProgramWithSignatureCommand() with
        {
            Parameters = [new QuestionParameterInput("arr", "BigDecimal")],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Test_cases_without_function_name_fail()
    {
        var command = ValidCodeProgramWithSignatureCommand() with { FunctionName = null };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Test_case_argument_count_mismatch_fails()
    {
        var command = ValidCodeProgramWithSignatureCommand() with
        {
            TestCases = [new QuestionTestCaseInput(["[12,35,1,10,34,1]", "5"], "34")],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
