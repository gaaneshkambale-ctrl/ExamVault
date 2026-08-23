namespace OnlineExamSystem.Shared.Contracts.Responses.Execution;

public record TestCaseOutcomeResponse(bool Passed, string ActualOutput, string ExpectedOutput, string? Error);

public record RunCodeResponse(IReadOnlyList<TestCaseOutcomeResponse> Outcomes);
