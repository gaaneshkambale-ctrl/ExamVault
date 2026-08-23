using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Infrastructure;

public class QuestionServiceClient : IQuestionAnswerKeyClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _httpClient;

    public QuestionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<AnswerKeyQuestion>> GetAnswerKeyAsync(
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
            .Select(q => new AnswerKeyQuestion(
                q.Id,
                q.QuestionText,
                q.Marks,
                q.SectionId,
                q.Options
                    .Select(o => new AnswerKeyOption(o.Id, o.OptionText, o.IsCorrect))
                    .ToList(),
                q.QuestionType))
            .ToList();
    }

    private sealed class QuestionApiResponse
    {
        public Guid Id { get; init; }
        public string QuestionText { get; init; } = string.Empty;
        public int Marks { get; init; }
        public Guid? SectionId { get; init; }
        public List<QuestionOptionApiResponse> Options { get; init; } = [];
        public string QuestionType { get; init; } = "MultipleChoice";
    }

    private sealed class QuestionOptionApiResponse
    {
        public Guid Id { get; init; }
        public string OptionText { get; init; } = string.Empty;
        public bool IsCorrect { get; init; }
    }
}
