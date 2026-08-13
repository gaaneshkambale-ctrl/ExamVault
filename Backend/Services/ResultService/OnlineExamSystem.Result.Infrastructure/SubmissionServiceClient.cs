using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Infrastructure;

public class SubmissionServiceClient : ISubmissionLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public SubmissionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<SubmissionLookupResult?> GetMyAttemptAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/submissions/mine?examId={examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<AttemptWithAnswersApiResponse>(
            JsonOptions,
            cancellationToken) ?? throw new InvalidOperationException("Empty response from Submission Service.");

        return new SubmissionLookupResult(
            body.Attempt.Id,
            body.Attempt.ExamId,
            body.Attempt.Status,
            body.Attempt.SubmittedAtUtc,
            body.Answers.Select(a => new SubmissionAnswer(a.QuestionId, a.SelectedOptionId)).ToList());
    }

    private sealed class AttemptWithAnswersApiResponse
    {
        public ExamAttemptApiResponse Attempt { get; init; } = new();
        public List<AttemptAnswerApiResponse> Answers { get; init; } = [];
    }

    private sealed class ExamAttemptApiResponse
    {
        public Guid Id { get; init; }
        public Guid ExamId { get; init; }
        public string Status { get; init; } = string.Empty;
        public DateTime? SubmittedAtUtc { get; init; }
    }

    private sealed class AttemptAnswerApiResponse
    {
        public Guid QuestionId { get; init; }
        public Guid? SelectedOptionId { get; init; }
    }
}
