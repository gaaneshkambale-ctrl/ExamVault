namespace OnlineExamSystem.Execution.Application.Interfaces;

// ReferenceQuery is the question's SampleAnswer - never returned to the
// browser by Question Service itself, only fetched here server-to-server
// so a Sql test case's expected rows can be derived by actually running it.
public record SqlQuestionInfo(string ReferenceQuery, IReadOnlyList<string> TestCaseSetupSql);

public interface IQuestionServiceClient
{
    Task<SqlQuestionInfo?> GetSqlQuestionAsync(
        Guid questionId,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
