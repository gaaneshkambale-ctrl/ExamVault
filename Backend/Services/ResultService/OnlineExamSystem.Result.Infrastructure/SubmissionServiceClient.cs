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
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/submissions/mine?examId={examId}");
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

        return ToResult(body);
    }

    public async Task<IReadOnlyList<SubmissionLookupResult>> GetAttemptsByExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/submissions/by-exam/{examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<List<AttemptWithAnswersApiResponse>>(
            JsonOptions,
            cancellationToken) ?? [];

        return body.Select(ToResult).ToList();
    }

    private static SubmissionLookupResult ToResult(AttemptWithAnswersApiResponse body) =>
        new(
            body.Attempt.Id,
            body.Attempt.UserId,
            body.Attempt.ExamId,
            body.Attempt.Status,
            body.Attempt.SubmittedAtUtc,
            body.Answers
                .Select(a => new SubmissionAnswer(
                    a.QuestionId, a.SelectedOptionId, a.AnswerText, a.MarksAwarded, a.SelectedOptionIds))
                .ToList(),
            body.Attempt.FullscreenExitCount,
            body.Attempt.NoFaceDetectedCount,
            body.Attempt.MultipleFacesDetectedCount,
            body.Attempt.TabSwitchCount,
            body.Attempt.MultipleTabsCount,
            body.Attempt.CopyPasteCount,
            body.Attempt.RightClickCount,
            body.Attempt.MultipleMonitorsCount);

    private sealed class AttemptWithAnswersApiResponse
    {
        public ExamAttemptApiResponse Attempt { get; init; } = new();
        public List<AttemptAnswerApiResponse> Answers { get; init; } = [];
    }

    private sealed class ExamAttemptApiResponse
    {
        public Guid Id { get; init; }
        public Guid UserId { get; init; }
        public Guid ExamId { get; init; }
        public string Status { get; init; } = string.Empty;
        public DateTime? SubmittedAtUtc { get; init; }
        public int FullscreenExitCount { get; init; }
        public int NoFaceDetectedCount { get; init; }
        public int MultipleFacesDetectedCount { get; init; }
        public int TabSwitchCount { get; init; }
        public int MultipleTabsCount { get; init; }
        public int CopyPasteCount { get; init; }
        public int RightClickCount { get; init; }
        public int MultipleMonitorsCount { get; init; }
    }

    private sealed class AttemptAnswerApiResponse
    {
        public Guid QuestionId { get; init; }
        public Guid? SelectedOptionId { get; init; }
        public string? AnswerText { get; init; }
        public int? MarksAwarded { get; init; }
        public IReadOnlyList<Guid>? SelectedOptionIds { get; init; }
    }
}
