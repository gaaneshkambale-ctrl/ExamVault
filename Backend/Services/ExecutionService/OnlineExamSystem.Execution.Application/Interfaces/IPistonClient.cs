namespace OnlineExamSystem.Execution.Application.Interfaces;

public record PistonFile(string Name, string Content);

public record PistonExecutionResult(
    string? CompileStdout,
    string? CompileStderr,
    int? CompileExitCode,
    string RunStdout,
    string RunStderr,
    int RunExitCode);

public interface IPistonClient
{
    Task<PistonExecutionResult> ExecuteAsync(
        string pistonLanguage,
        string pistonVersion,
        IReadOnlyList<PistonFile> files,
        CancellationToken cancellationToken = default);
}
