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

    public async Task<IReadOnlyList<SectionLookupResult>> GetSectionsAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/exams/{examId}/sections");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return Array.Empty<SectionLookupResult>();
        }

        response.EnsureSuccessStatusCode();

        var sections = await response.Content.ReadFromJsonAsync<List<SectionApiResponse>>(JsonOptions, cancellationToken)
            ?? new List<SectionApiResponse>();

        return sections
            .Select(s => new SectionLookupResult(
                s.Id,
                s.Name,
                s.DisplayOrder,
                s.DurationMinutes,
                s.NavigationType,
                s.NegativeMarkingEnabled,
                s.NegativeMarks,
                s.ShuffleQuestions,
                s.ShuffleOptions,
                s.AllowReview))
            .ToList();
    }

    private sealed class ExamApiResponse
    {
        public Guid Id { get; init; }
        public string Status { get; init; } = string.Empty;
        public int MaxAttempts { get; init; }
        public DateTime? StartAtUtc { get; init; }
        public DateTime? EndAtUtc { get; init; }
    }

    private sealed class SectionApiResponse
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public int DisplayOrder { get; init; }
        public int DurationMinutes { get; init; }
        public string NavigationType { get; init; } = string.Empty;
        public bool NegativeMarkingEnabled { get; init; }
        public decimal NegativeMarks { get; init; }
        public bool ShuffleQuestions { get; init; }
        public bool ShuffleOptions { get; init; }
        public bool AllowReview { get; init; }
    }
}
