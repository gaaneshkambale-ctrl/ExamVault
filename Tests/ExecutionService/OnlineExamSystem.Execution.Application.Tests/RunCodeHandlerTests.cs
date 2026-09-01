using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Application.Run;
using OnlineExamSystem.Execution.Application.Tests.Fakes;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Tests;

public class RunCodeHandlerTests
{
    private static JsonElement Json(string raw) => JsonDocument.Parse(raw).RootElement;

    private static RunCodeCommand Command(params TestCaseInput[] testCases) =>
        new(
            "Python",
            "def secondLargest(arr):\n    return -1",
            "secondLargest",
            [new FunctionParameter("arr", ParameterType.IntArray)],
            ParameterType.Int,
            testCases);

    [Fact]
    public async Task Matching_output_passes()
    {
        var piston = new FakePistonClient(new PistonExecutionResult(null, null, null, "34\n", "", 0));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(new TestCaseInput([Json("[12,35,1,10,34,1]")], Json("34"))));

        Assert.True(result.Success);
        Assert.True(result.Outcomes[0].Passed);
        Assert.Equal("34", result.Outcomes[0].ActualOutput);
    }

    [Fact]
    public async Task Mismatched_output_fails_without_error()
    {
        var piston = new FakePistonClient(new PistonExecutionResult(null, null, null, "-1\n", "", 0));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(new TestCaseInput([Json("[12,35,1,10,34,1]")], Json("34"))));

        Assert.True(result.Success);
        Assert.False(result.Outcomes[0].Passed);
        Assert.Null(result.Outcomes[0].Error);
    }

    [Fact]
    public async Task Compile_error_fails_with_error_message()
    {
        var piston = new FakePistonClient(new PistonExecutionResult("", "syntax error", 1, "", "", 0));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(new TestCaseInput([Json("[1,2,3]")], Json("34"))));

        Assert.True(result.Success);
        Assert.False(result.Outcomes[0].Passed);
        Assert.Equal("syntax error", result.Outcomes[0].Error);
    }

    [Fact]
    public async Task Runtime_error_fails_with_error_message()
    {
        var piston = new FakePistonClient(new PistonExecutionResult(null, null, null, "", "boom", 1));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(new TestCaseInput([Json("[1,2,3]")], Json("34"))));

        Assert.True(result.Success);
        Assert.False(result.Outcomes[0].Passed);
        Assert.Equal("boom", result.Outcomes[0].Error);
    }

    [Fact]
    public async Task Piston_unavailable_fails_gracefully_instead_of_throwing()
    {
        var piston = new FakePistonClient(new HttpRequestException("connection refused"));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(new TestCaseInput([Json("[1,2,3]")], Json("34"))));

        Assert.True(result.Success);
        Assert.False(result.Outcomes[0].Passed);
        Assert.NotNull(result.Outcomes[0].Error);
    }

    [Fact]
    public async Task Multiple_test_cases_each_get_their_own_outcome()
    {
        var piston = new FakePistonClient(
            new PistonExecutionResult(null, null, null, "34\n", "", 0),
            new PistonExecutionResult(null, null, null, "-1\n", "", 0));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(
            new TestCaseInput([Json("[12,35,1,10,34,1]")], Json("34")),
            new TestCaseInput([Json("[10,10,10]")], Json("-1"))));

        Assert.Equal(2, result.Outcomes.Count);
        Assert.True(result.Outcomes[0].Passed);
        Assert.True(result.Outcomes[1].Passed);
    }

    [Fact]
    public async Task Invalid_command_returns_validation_errors_without_calling_piston()
    {
        var piston = new FakePistonClient(new PistonExecutionResult(null, null, null, "34", "", 0));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator()],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command() with { TestCases = [] });

        Assert.False(result.Success);
        Assert.NotEmpty(result.ValidationErrors);
        Assert.Empty(piston.ReceivedFiles);
    }

    [Fact]
    public async Task Unknown_language_returns_invalid_without_calling_piston()
    {
        var piston = new FakePistonClient(new PistonExecutionResult(null, null, null, "34", "", 0));
        var handler = new RunCodeHandler(
            [new FakeDriverGenerator("Java")],
            piston,
            new RunCodeValidator(),
            NullLogger<RunCodeHandler>.Instance);

        var result = await handler.HandleAsync(Command(new TestCaseInput([Json("[1,2,3]")], Json("34"))));

        Assert.False(result.Success);
        Assert.Empty(piston.ReceivedFiles);
    }
}
