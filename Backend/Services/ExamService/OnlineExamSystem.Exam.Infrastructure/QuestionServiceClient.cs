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

    public async Task<IReadOnlyDictionary<Guid, int>> GetQuestionCountsBySectionAsync(
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
        var counts = new Dictionary<Guid, int>();
        foreach (var question in questions ?? [])
        {
            if (question.TryGetProperty("sectionId", out var sectionIdProperty) &&
                sectionIdProperty.ValueKind == JsonValueKind.String &&
                sectionIdProperty.GetGuid() is var sectionId)
            {
                counts[sectionId] = counts.GetValueOrDefault(sectionId) + 1;
            }
        }
        return counts;
    }

    public async Task DeleteQuestionsForExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            $"internal/questions/exams/{examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
