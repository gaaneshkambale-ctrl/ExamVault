using Microsoft.Extensions.Logging;
using OnlineExamSystem.Execution.Application.Interfaces;

namespace OnlineExamSystem.Execution.Application.Sql;

// Called by Question Service (internal, service-to-service) when an admin
// saves a Sql question, so the Expected Output can be shown to students up
// front instead of only after they click Run. Uses the exact same
// canonicalization as RunSqlHandler's own reference-query side, via
// SqlReferenceRunner, so a precomputed Expected Output can never disagree
// with what a live Run would show.
public class ComputeSqlExpectedOutputHandler
{
    private readonly IPistonClient _pistonClient;
    private readonly ILogger<ComputeSqlExpectedOutputHandler> _logger;

    public ComputeSqlExpectedOutputHandler(IPistonClient pistonClient, ILogger<ComputeSqlExpectedOutputHandler> logger)
    {
        _pistonClient = pistonClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<SqlExpectedOutputItem>> HandleAsync(
        string referenceQuery,
        IReadOnlyList<string> setupSqlList,
        CancellationToken cancellationToken = default)
    {
        var results = new List<SqlExpectedOutputItem>(setupSqlList.Count);
        foreach (var setupSql in setupSqlList)
        {
            var (success, output, error) = await SqlReferenceRunner.ExecuteAsync(
                _pistonClient, setupSql, referenceQuery, cancellationToken);

            if (!success)
            {
                _logger.LogWarning("Failed to precompute Sql expected output: {Error}", error);
            }

            results.Add(new SqlExpectedOutputItem(success, output, error));
        }

        return results;
    }
}

public record SqlExpectedOutputItem(bool Success, string Output, string? Error);
