using OnlineExamSystem.Question.Application.Interfaces;

namespace OnlineExamSystem.Question.Application.Tests.Fakes;

// Never actually called in these Application-layer tests (no real Execution
// Service to hit) - CreateQuestionHandler/UpdateQuestionHandler only invoke
// it for Sql questions with a non-empty bearer token, which these tests
// don't exercise. Present purely to satisfy the constructor.
public class FakeSqlExpectedOutputClient : ISqlExpectedOutputClient
{
    public Task<IReadOnlyList<SqlExpectedOutputResult>> ComputeAsync(
        string referenceQuery,
        IReadOnlyList<string> setupSqlList,
        string bearerToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<SqlExpectedOutputResult>>([]);
}
