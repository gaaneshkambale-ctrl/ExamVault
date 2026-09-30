using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Submission.Application.Interfaces;

namespace OnlineExamSystem.Submission.Infrastructure;

// Same internal, gateway-unreachable endpoint ResultService's
// QuestionServiceClient already calls (internal/questions/answer-key) - safe to
// call with a forwarded student bearer token because the response never reaches
// a browser, only this backend service.
public class QuestionServiceClient : IQuestionLookupClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public QuestionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<QuestionLookupResult>> GetQuestionsAsync(
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

        var questions = await response.Content.ReadFromJsonAsync<List<QuestionApiResponse>>(
            JsonOptions,
            cancellationToken) ?? [];

        return questions
            .Select(q => new QuestionLookupResult(q.Id, q.SectionId, q.CreatedOn))
            .ToList();
    }

    private sealed class QuestionApiResponse
    {
        public Guid Id { get; init; }
        public Guid? SectionId { get; init; }
        public DateTime CreatedOn { get; init; }
    }
}
