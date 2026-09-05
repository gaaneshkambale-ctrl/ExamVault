using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Infrastructure;

public class QuestionServiceClient : IQuestionServiceClient
{
    private readonly HttpClient _httpClient;

    public QuestionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task UnassignSectionQuestionsAsync(
        Guid sectionId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"internal/questions/sections/{sectionId}/unassign");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<int> GetQuestionCountAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"internal/questions/answer-key?examId={examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var questions = await response.Content.ReadFromJsonAsync<List<JsonElement>>(cancellationToken: cancellationToken);
        return questions?.Count ?? 0;
    }
}
