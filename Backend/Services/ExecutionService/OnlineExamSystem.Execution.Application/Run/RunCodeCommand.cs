using System.Text.Json;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Run;

public record TestCaseInput(IReadOnlyList<JsonElement> Arguments, JsonElement ExpectedOutput);

public record RunCodeCommand(
    string Language,
    string StudentCode,
    string FunctionName,
    IReadOnlyList<FunctionParameter> Parameters,
    ParameterType ReturnType,
    IReadOnlyList<TestCaseInput> TestCases);
