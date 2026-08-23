using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnlineExamSystem.Shared.Contracts.Responses.Question;

namespace OnlineExamSystem.Execution.Worker;

public interface IQuestionServiceClient
{
    Task<QuestionResponse?> GetQuestionAsync(Guid questionId, string bearerToken, CancellationToken cancellationToken);
}

public class QuestionServiceClient : IQuestionServiceClient
{
    private readonly HttpClient _httpClient;

    public QuestionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<QuestionResponse?> GetQuestionAsync(
        Guid questionId,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"internal/questions/{questionId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<QuestionResponse>(cancellationToken: cancellationToken);
    }
}
