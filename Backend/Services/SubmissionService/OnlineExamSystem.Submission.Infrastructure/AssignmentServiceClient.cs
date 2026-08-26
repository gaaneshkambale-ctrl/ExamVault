using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Infrastructure;

public class AssignmentServiceClient : IAssignmentLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public AssignmentServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<AssignmentLookupResult?> GetMyAssignmentAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/assignments/mine?examId={examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<AssignmentApiResponse>(JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException("Empty response from Exam Service.");

        return new AssignmentLookupResult(
            body.Id,
            body.ExamId,
            body.StartAtUtc,
            body.EndAtUtc,
            body.MaxAttempts,
            body.EnableProctoring,
            body.EnableLiveVideo);
    }

    private sealed class AssignmentApiResponse
    {
        public Guid Id { get; init; }
        public Guid ExamId { get; init; }
        public DateTime StartAtUtc { get; init; }
        public DateTime EndAtUtc { get; init; }
        public int MaxAttempts { get; init; }
        public bool EnableProctoring { get; init; }
        public bool EnableLiveVideo { get; init; }
    }
}
