namespace OnlineExamSystem.Shared.Contracts.Responses.Execution;

public record TestCaseOutcomeResponse(bool Passed, string ActualOutput, string ExpectedOutput, string? Error);

public record RunCodeResponse(IReadOnlyList<TestCaseOutcomeResponse> Outcomes);

// Internal, service-to-service only - see ComputeSqlExpectedOutputRequest.
// One item per Setup SQL passed in, same order. Success is false when the
// reference query itself failed to run (e.g. a schema/query mismatch) -
// Output is empty and Error explains why; Question Service stores a null
// ExpectedOutput for that test case rather than failing the whole save.
public record SqlExpectedOutputItemResponse(bool Success, string Output, string? Error);

public record ComputeSqlExpectedOutputResponse(IReadOnlyList<SqlExpectedOutputItemResponse> Results);
