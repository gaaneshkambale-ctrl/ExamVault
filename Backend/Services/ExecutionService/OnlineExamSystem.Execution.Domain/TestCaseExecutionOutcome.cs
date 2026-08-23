namespace OnlineExamSystem.Execution.Domain;

// Error is set only when the run itself failed (compile error, runtime
// exception, timeout) - a wrong-but-successful run has Error null and
// Passed false, with ActualOutput holding whatever the program printed.
public record TestCaseExecutionOutcome(
    bool Passed,
    string ActualOutput,
    string ExpectedOutput,
    string? Error);
