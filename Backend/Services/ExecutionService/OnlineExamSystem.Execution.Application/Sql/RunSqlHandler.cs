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
            var expected = await SqlReferenceRunner.ExecuteAsync(
                _pistonClient, setupSql, question.ReferenceQuery, cancellationToken);
            if (!expected.Success)
            {
                _logger.LogError(
                    "Reference query execution failed for question {QuestionId}: {Error}",
                    command.QuestionId,
                    expected.Error);
                outcomes.Add(new TestCaseExecutionOutcome(
                    false, string.Empty, string.Empty, "Unable to grade this test case. Please contact your instructor."));
                continue;
            }

            var expectedRows = expected.Output;

            var actual = await SqlReferenceRunner.ExecuteAsync(
                _pistonClient, setupSql, command.StudentQuery, cancellationToken);
            if (!actual.Success)
            {
                outcomes.Add(new TestCaseExecutionOutcome(false, string.Empty, expectedRows, actual.Error));
                continue;
            }

            var actualRows = actual.Output;
            outcomes.Add(new TestCaseExecutionOutcome(actualRows == expectedRows, actualRows, expectedRows, null));
        }

        return RunSqlResult.Ok(outcomes);
    }
}
