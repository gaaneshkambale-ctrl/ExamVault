using Microsoft.Extensions.Logging;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Domain.Entities;

namespace OnlineExamSystem.Question.Application.Questions;

// Shared by CreateQuestionHandler and UpdateQuestionHandler - both build a
// list of QuestionSqlTestCase entities from the incoming command, then call
// this to fill in each one's ExpectedOutput before saving. Best-effort: if
// Execution Service is unreachable or the reference query fails, the
// question still saves (with ExpectedOutput left null) rather than blocking
// the admin - Run Code still grades correctly regardless, since that path
// recomputes live and never reads this cached value.
public static class SqlExpectedOutputPopulator
{
    public static async Task PopulateAsync(
        ISqlExpectedOutputClient client,
        ILogger logger,
        string? programmingLanguage,
        string? sampleAnswer,
        string? bearerToken,
        IReadOnlyList<QuestionSqlTestCase> sqlTestCases,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(programmingLanguage, "Sql", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(sampleAnswer)
            || sqlTestCases.Count == 0
            || string.IsNullOrWhiteSpace(bearerToken))
        {
            return;
        }

        try
        {
            var results = await client.ComputeAsync(
                sampleAnswer,
                sqlTestCases.Select(t => t.SetupSql).ToList(),
                bearerToken,
                cancellationToken);

            for (var i = 0; i < sqlTestCases.Count && i < results.Count; i++)
            {
                sqlTestCases[i].ExpectedOutput = results[i].Success ? results[i].Output : null;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to precompute Sql Expected Output - question will save without it.");
        }
    }
}
