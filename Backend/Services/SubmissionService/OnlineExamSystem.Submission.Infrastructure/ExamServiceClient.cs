using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Infrastructure;

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

        return new ExamLookupResult(exam.Id, exam.Status, exam.MaxAttempts, exam.StartAtUtc, exam.EndAtUtc);
    }

    private sealed class ExamApiResponse
    {
        public Guid Id { get; init; }
        public string Status { get; init; } = string.Empty;
        public int MaxAttempts { get; init; }
        public DateTime? StartAtUtc { get; init; }
        public DateTime? EndAtUtc { get; init; }
    }
}
