using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Run;

public class RunCodeResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public IReadOnlyList<TestCaseExecutionOutcome> Outcomes { get; init; } = Array.Empty<TestCaseExecutionOutcome>();

    public static RunCodeResult Ok(IReadOnlyList<TestCaseExecutionOutcome> outcomes) =>
        new() { Success = true, Outcomes = outcomes };

    public static RunCodeResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
