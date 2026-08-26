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

    private static UpdateQuestionCommand ValidCodeProgramCommand() =>
        new(
            Guid.NewGuid(),
            "CodeProgram",
            "Write a method that reverses a string.",
            5,
            "Medium",
            [],
            ProgrammingLanguage: "CSharp");

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

    private static UpdateQuestionCommand ValidCodeProgramWithSignatureCommand() =>
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
