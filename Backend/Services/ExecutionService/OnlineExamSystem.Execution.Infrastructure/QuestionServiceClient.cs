using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Shared.Contracts.Responses.Question;

namespace OnlineExamSystem.Execution.Infrastructure;

// Forwards the CALLER'S OWN bearer token (a student's for interactive Run
// Code, the Worker's system token for auto-grading) to Question Service's
// internal endpoint - never a token minted here. [Authorize] with no role
// restriction on that endpoint means either caller works, and the browser
// never sees or transmits the Reference Query this fetches.
public class QuestionServiceClient : IQuestionServiceClient
{
    private readonly HttpClient _httpClient;

    public QuestionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<SqlQuestionInfo?> GetSqlQuestionAsync(
        Guid questionId,
        string bearerToken,
        CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"internal/questions/{questionId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        var question = await response.Content.ReadFromJsonAsync<QuestionResponse>(cancellationToken: cancellationToken);
        if (question is null || string.IsNullOrWhiteSpace(question.SampleAnswer))
        {
            return null;
        }

        return new SqlQuestionInfo(
            question.SampleAnswer,
            (question.SqlTestCases ?? [])
                .OrderBy(t => t.DisplayOrder)
                .Select(t => t.SetupSql)
                .ToList());
    }
}
