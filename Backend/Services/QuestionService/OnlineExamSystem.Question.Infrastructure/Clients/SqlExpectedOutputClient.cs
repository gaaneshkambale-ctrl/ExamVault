using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Shared.Contracts.Requests.Execution;
using OnlineExamSystem.Shared.Contracts.Responses.Execution;

namespace OnlineExamSystem.Question.Infrastructure.Clients;

// Forwards the CALLER'S OWN bearer token (the admin saving the question) -
// never a token minted here. Mirrors Execution Service's own
// QuestionServiceClient, just in the opposite direction.
public class SqlExpectedOutputClient : ISqlExpectedOutputClient
{
    private readonly HttpClient _httpClient;

    public SqlExpectedOutputClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<SqlExpectedOutputResult>> ComputeAsync(
        string referenceQuery,
        IReadOnlyList<string> setupSqlList,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "internal/execution/sql-expected-output")
        {
            Content = JsonContent.Create(new ComputeSqlExpectedOutputRequest(referenceQuery, setupSqlList)),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<ComputeSqlExpectedOutputResponse>(
            cancellationToken: cancellationToken);

        return (body?.Results ?? [])
            .Select(r => new SqlExpectedOutputResult(r.Success, r.Output, r.Error))
            .ToList();
    }
}
