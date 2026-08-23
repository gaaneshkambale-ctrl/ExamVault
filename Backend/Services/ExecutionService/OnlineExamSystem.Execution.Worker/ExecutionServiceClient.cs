using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnlineExamSystem.Shared.Contracts.Requests.Execution;
using OnlineExamSystem.Shared.Contracts.Responses.Execution;

namespace OnlineExamSystem.Execution.Worker;

public interface IExecutionServiceClient
{
    Task<RunCodeResponse> RunAsync(RunCodeRequest request, string bearerToken, CancellationToken cancellationToken);

    Task<RunCodeResponse> RunSqlAsync(RunSqlRequest request, string bearerToken, CancellationToken cancellationToken);
}

public class ExecutionServiceClient : IExecutionServiceClient
{
    private readonly HttpClient _httpClient;

    public ExecutionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<RunCodeResponse> RunAsync(
        RunCodeRequest request,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/execution/run")
        {
            Content = JsonContent.Create(request),
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<RunCodeResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Empty response from Execution Service.");
    }

    public async Task<RunCodeResponse> RunSqlAsync(
        RunSqlRequest request,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "api/execution/run-sql")
        {
            Content = JsonContent.Create(request),
        };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<RunCodeResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Empty response from Execution Service.");
    }
}
