using System.Text.Json;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Sql;

// Sql questions have no function-signature harness - each test case is a
// fresh in-memory database (SetupSql) that both the Reference Query
// (fetched server-side, never sent to the browser) and the student's query
// run against. Expected rows are always derived by actually running the
// reference query, never hand-typed, so they can never drift out of sync
// with the schema.
public class RunSqlHandler
{
    private const string PistonLanguage = "sqlite3";
    private const string PistonVersion = "3.36.0";

    private readonly IQuestionServiceClient _questionServiceClient;
    private readonly IPistonClient _pistonClient;
    private readonly ILogger<RunSqlHandler> _logger;

    public RunSqlHandler(
        IQuestionServiceClient questionServiceClient,
        IPistonClient pistonClient,
        ILogger<RunSqlHandler> logger)
    {
        _questionServiceClient = questionServiceClient;
        _pistonClient = pistonClient;
        _logger = logger;
    }

    public async Task<RunSqlResult> HandleAsync(RunSqlCommand command, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.StudentQuery))
        {
            return RunSqlResult.Invalid(["Your query is empty."]);
        }

        var question = await _questionServiceClient.GetSqlQuestionAsync(
            command.QuestionId, command.BearerToken, cancellationToken);
        if (question is null || question.TestCaseSetupSql.Count == 0)
        {
            return RunSqlResult.Invalid(["This question has no Sql test cases configured."]);
        }

        var outcomes = new List<TestCaseExecutionOutcome>(question.TestCaseSetupSql.Count);
        foreach (var setupSql in question.TestCaseSetupSql)
        {
            PistonExecutionResult expectedExec;
            try
            {
                expectedExec = await ExecuteQueryAsync(setupSql, question.ReferenceQuery, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Reference query execution failed for question {QuestionId}.", command.QuestionId);
                outcomes.Add(new TestCaseExecutionOutcome(
                    false, string.Empty, string.Empty, "Unable to grade this test case. Please contact your instructor."));
                continue;
            }

            if (expectedExec.RunExitCode != 0)
            {
                _logger.LogError(
                    "Reference query returned a non-zero exit code for question {QuestionId}: {Stderr}",
                    command.QuestionId,
                    expectedExec.RunStderr);
                outcomes.Add(new TestCaseExecutionOutcome(
                    false, string.Empty, string.Empty, "Unable to grade this test case. Please contact your instructor."));
                continue;
            }

            var expectedRows = CanonicalRowSet(expectedExec.RunStdout);

            PistonExecutionResult actualExec;
            try
            {
                actualExec = await ExecuteQueryAsync(setupSql, command.StudentQuery, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Piston execution failed for Sql student query.");
                outcomes.Add(new TestCaseExecutionOutcome(
                    false, string.Empty, expectedRows, "Execution service unavailable. Please try again."));
                continue;
            }

            if (actualExec.RunExitCode != 0)
            {
                outcomes.Add(new TestCaseExecutionOutcome(
                    false,
                    string.Empty,
                    expectedRows,
                    string.IsNullOrWhiteSpace(actualExec.RunStderr)
                        ? "The query failed to run."
                        : actualExec.RunStderr.Trim()));
                continue;
            }

            var actualRows = CanonicalRowSet(actualExec.RunStdout);
            outcomes.Add(new TestCaseExecutionOutcome(actualRows == expectedRows, actualRows, expectedRows, null));
        }

        return RunSqlResult.Ok(outcomes);
    }

    private Task<PistonExecutionResult> ExecuteQueryAsync(
        string setupSql,
        string query,
        CancellationToken cancellationToken)
    {
        var script = ".mode json\n" + setupSql + "\n" + query;
        return _pistonClient.ExecuteAsync(
            PistonLanguage, PistonVersion, [new PistonFile("main.sql", script)], cancellationToken);
    }

    // A zero-row result prints nothing (not "[]") - Piston-verified. Each
    // row's own key order is preserved (column order matters for grading);
    // only the ACROSS-rows order is normalized, matching the "unordered set
    // comparison" decision - a query that returns the same rows in a
    // different order still passes.
    private static string CanonicalRowSet(string stdout)
    {
        var trimmed = stdout.Trim();
        if (trimmed.Length == 0)
        {
            return string.Empty;
        }

        using var document = JsonDocument.Parse(trimmed);
        var rows = document.RootElement.EnumerateArray()
            .Select(row => row.GetRawText())
            .OrderBy(row => row, StringComparer.Ordinal);
        return string.Join("\n", rows);
    }
}
