using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Infrastructure;

public class ExamServiceClient : IExamLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public ExamServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ExamLookupResult?> GetExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/exams/{examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var exam = await response.Content.ReadFromJsonAsync<ExamApiResponse>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("Empty response from Exam Service.");

        return new ExamLookupResult(exam.Id, exam.Title, exam.TotalMarks, exam.PassingMarks);
    }

    public async Task<bool> GetShowCorrectAnswersAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/assignments/mine?examId={examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return true;
        }

        response.EnsureSuccessStatusCode();

        var assignment = await response.Content.ReadFromJsonAsync<MyAssignmentApiResponse>(
            JsonOptions,
            cancellationToken);
        return assignment?.ShowCorrectAnswers ?? true;
    }

    private sealed class ExamApiResponse
    {
        public Guid Id { get; init; }
        public string Title { get; init; } = string.Empty;
        public int TotalMarks { get; init; }
        public int PassingMarks { get; init; }
    }

    private sealed class MyAssignmentApiResponse
    {
        public bool ShowCorrectAnswers { get; init; }
    }
}
