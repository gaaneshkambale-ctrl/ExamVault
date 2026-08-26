using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace OnlineExamSystem.Execution.Worker;

public interface ISubmissionServiceClient
{
    Task GradeAsync(
        Guid attemptId,
        Guid questionId,
        int marksAwarded,
        string bearerToken,
        CancellationToken cancellationToken);
}

public class SubmissionServiceClient : ISubmissionServiceClient
{
    private readonly HttpClient _httpClient;

    public SubmissionServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task GradeAsync(
        Guid attemptId,
        Guid questionId,
        int marksAwarded,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Put,
            $"api/submissions/{attemptId}/answers/{questionId}/grade")
        {
            Content = JsonContent.Create(new { marksAwarded }),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
