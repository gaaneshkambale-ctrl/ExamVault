using System.Text.Json;
using OnlineExamSystem.Execution.Application.Run;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Tests;

public class RunCodeValidatorTests
{
    private readonly RunCodeValidator _validator = new();

    private static JsonElement Json(string raw) => JsonDocument.Parse(raw).RootElement;

    private static RunCodeCommand ValidCommand() =>
        new(
            "Python",
            "def secondLargest(arr):\n    return -1",
            "secondLargest",
            [new FunctionParameter("arr", ParameterType.IntArray)],
            ParameterType.Int,
            [new TestCaseInput([Json("[12,35,1,10,34,1]")], Json("34"))]);

    [Fact]
    public void Valid_command_passes()
    {
        var result = _validator.Validate(ValidCommand());

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Unsupported_language_fails()
    {
        var command = ValidCommand() with { Language = "Ruby" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Empty_student_code_fails()
    {
        var command = ValidCommand() with { StudentCode = "" };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Empty_parameters_fails()
    {
        var command = ValidCommand() with { Parameters = [] };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Empty_test_cases_fails()
    {
        var command = ValidCommand() with { TestCases = [] };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Argument_count_mismatch_fails()
    {
        var command = ValidCommand() with
        {
            TestCases = [new TestCaseInput([Json("[1,2,3]"), Json("5")], Json("34"))],
        };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
