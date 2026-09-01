using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Run;

public class RunCodeHandler
{
    private readonly IReadOnlyDictionary<string, IDriverGenerator> _driverGeneratorsByLanguage;
    private readonly IPistonClient _pistonClient;
    private readonly IValidator<RunCodeCommand> _validator;
    private readonly ILogger<RunCodeHandler> _logger;

    public RunCodeHandler(
        IEnumerable<IDriverGenerator> driverGenerators,
        IPistonClient pistonClient,
        IValidator<RunCodeCommand> validator,
        ILogger<RunCodeHandler> logger)
    {
        _driverGeneratorsByLanguage = driverGenerators.ToDictionary(g => g.Language);
        _pistonClient = pistonClient;
        _validator = validator;
        _logger = logger;
    }

    public async Task<RunCodeResult> HandleAsync(RunCodeCommand command, CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return RunCodeResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        if (!_driverGeneratorsByLanguage.TryGetValue(command.Language, out var driverGenerator))
        {
            return RunCodeResult.Invalid([$"No driver generator registered for language '{command.Language}'."]);
        }

        // Sequential, not fired all at once - the Piston container is shared
        // across every student running code at the same time; one test case
        // in flight per call protects it under load.
        var outcomes = new List<TestCaseExecutionOutcome>(command.TestCases.Count);
        foreach (var testCase in command.TestCases)
        {
            IReadOnlyList<PistonFile> files;
            try
            {
                files = driverGenerator.BuildFiles(
                    command.StudentCode,
                    command.FunctionName,
                    command.Parameters,
                    command.ReturnType,
                    testCase.Arguments);
            }
            catch (DriverGenerationException ex)
            {
                outcomes.Add(new TestCaseExecutionOutcome(
                    false,
                    string.Empty,
                    testCase.ExpectedOutput.GetRawText(),
                    ex.Message));
                continue;
            }

            PistonExecutionResult executionResult;
            try
            {
                executionResult = await _pistonClient.ExecuteAsync(
                    driverGenerator.PistonLanguage,
                    driverGenerator.PistonVersion,
                    files,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Piston execution failed for language {Language}.", command.Language);
                outcomes.Add(new TestCaseExecutionOutcome(
                    false,
                    string.Empty,
                    testCase.ExpectedOutput.GetRawText(),
                    "Execution service unavailable. Please try again."));
                continue;
            }

            var hasCompileError = executionResult.CompileExitCode is not null and not 0;
            if (hasCompileError)
            {
                outcomes.Add(new TestCaseExecutionOutcome(
                    false,
                    string.Empty,
                    testCase.ExpectedOutput.GetRawText(),
                    executionResult.CompileStderr));
                continue;
            }

            if (executionResult.RunExitCode != 0)
            {
                outcomes.Add(new TestCaseExecutionOutcome(
                    false,
                    executionResult.RunStdout.Trim(),
                    testCase.ExpectedOutput.GetRawText(),
                    string.IsNullOrWhiteSpace(executionResult.RunStderr)
                        ? "The program exited with an error."
                        : executionResult.RunStderr));
                continue;
            }

            var actual = executionResult.RunStdout.Trim();
            var expected = testCase.ExpectedOutput.GetRawText().Trim();
            outcomes.Add(new TestCaseExecutionOutcome(actual == expected, actual, expected, null));
        }

        return RunCodeResult.Ok(outcomes);
    }
}
