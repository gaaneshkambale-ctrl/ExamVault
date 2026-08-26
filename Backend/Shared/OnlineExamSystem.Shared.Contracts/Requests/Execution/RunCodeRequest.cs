using System.Text.Json;

namespace OnlineExamSystem.Shared.Contracts.Requests.Execution;

public record RunCodeParameterRequest(string Name, string Type);

public record RunCodeTestCaseRequest(IReadOnlyList<JsonElement> Arguments, JsonElement ExpectedOutput);

public record RunCodeRequest(
    string Language,
    string StudentCode,
    string FunctionName,
    IReadOnlyList<RunCodeParameterRequest> Parameters,
    string ReturnType,
    IReadOnlyList<RunCodeTestCaseRequest> TestCases);

// Sql questions only - no function signature/arguments concept applies, so
// this is a deliberately narrower request shape than RunCodeRequest. The
// Reference Query and each test case's Setup SQL are fetched server-side by
// Execution Service itself, never sent by the browser.
public record RunSqlRequest(Guid QuestionId, string StudentQuery);
