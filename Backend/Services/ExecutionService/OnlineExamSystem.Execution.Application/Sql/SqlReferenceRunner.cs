using System.Text.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Domain;

namespace OnlineExamSystem.Execution.Application.Sql;

// Shared by RunSqlHandler (grading a student's query against the reference
// query, live) and ComputeSqlExpectedOutputHandler (precomputing the
// reference query's own output when an admin saves a question). Both MUST
// canonicalize identically, or a student's exactly-correct query could show
// as "different" from the Expected Output shown up front.
public static class SqlReferenceRunner
{
    private const string PistonLanguage = "sqlite3";
    private const string PistonVersion = "3.36.0";

    public static async Task<(bool Success, string Output, string? Error)> ExecuteAsync(
        IPistonClient pistonClient,
        string setupSql,
        string query,
        CancellationToken cancellationToken)
    {
        PistonExecutionResult exec;
        try
        {
            var script = ".mode json\n" + setupSql + "\n" + query;
            exec = await pistonClient.ExecuteAsync(
                PistonLanguage, PistonVersion, [new PistonFile("main.sql", script)], cancellationToken);
        }
        catch (Exception)
        {
            return (false, string.Empty, "Execution service unavailable. Please try again.");
        }

        if (exec.RunExitCode != 0)
        {
            return (
                false,
                string.Empty,
                string.IsNullOrWhiteSpace(exec.RunStderr) ? "The query failed to run." : exec.RunStderr.Trim());
        }

        return (true, CanonicalRowSet(exec.RunStdout), null);
    }

    // A zero-row result prints nothing (not "[]") - Piston-verified. Each
    // row's own key order is preserved (column order matters for grading);
    // only the ACROSS-rows order is normalized, matching the "unordered set
    // comparison" decision - a query that returns the same rows in a
    // different order still passes.
    public static string CanonicalRowSet(string stdout)
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
