namespace OnlineExamSystem.Question.Application.Interfaces;

public record SqlExpectedOutputResult(bool Success, string Output, string? Error);

/// <summary>Precomputes what a Sql question's reference query returns for each test case's
/// Setup SQL, by calling Execution Service's internal endpoint (never routed through the
/// Gateway). Called when an admin creates/updates a Sql question, so students can see
/// Expected Output before running anything themselves.</summary>
public interface ISqlExpectedOutputClient
{
    Task<IReadOnlyList<SqlExpectedOutputResult>> ComputeAsync(
        string referenceQuery,
        IReadOnlyList<string> setupSqlList,
        string bearerToken,
        CancellationToken cancellationToken = default);
}
