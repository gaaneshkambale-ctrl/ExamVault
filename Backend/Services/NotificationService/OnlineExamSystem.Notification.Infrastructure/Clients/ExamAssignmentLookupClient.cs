using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Infrastructure.Clients;

public class ExamAssignmentLookupClient : IExamAssignmentLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public ExamAssignmentLookupClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<Guid>> GetTargetUserIdsForExamAsync(
        Guid examId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"api/assignments?examId={examId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var assignments = await response.Content.ReadFromJsonAsync<List<AssignmentApiResponse>>(
            JsonOptions,
            cancellationToken) ?? [];

        return assignments
            .SelectMany(a => a.TargetUserIds)
            .Distinct()
            .ToList();
    }

    private sealed class AssignmentApiResponse
    {
        public List<Guid> TargetUserIds { get; init; } = [];
    }
}
