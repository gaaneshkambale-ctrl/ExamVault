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

// Internal, service-to-service only (Question Service -> Execution Service,
// called when an admin saves a Sql question) - precomputes what the
// reference query returns for each test case's Setup SQL, so students can
// see Expected Output before running anything themselves. Takes the
// Reference Query and Setup SQL directly rather than a QuestionId, since
// Question Service already has both in hand at save time and passing them
// inline avoids a call back into Question Service from here.
public record ComputeSqlExpectedOutputRequest(string ReferenceQuery, IReadOnlyList<string> SetupSqlList);
