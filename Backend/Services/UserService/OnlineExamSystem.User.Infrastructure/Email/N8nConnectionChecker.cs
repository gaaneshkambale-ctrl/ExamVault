using Microsoft.Extensions.Logging;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Infrastructure.Email;

// Deliberately sends HEAD, never POST - a real POST would trigger the n8n
// workflow itself (and potentially send a garbage-payload email). Any HTTP
// response at all, even a 404/405 for a method n8n doesn't accept on that
// webhook, proves the instance is up and reachable; only a timeout,
// connection refusal, or DNS failure counts as Unreachable.
public class N8nConnectionChecker : IEmailConnectionChecker
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<N8nConnectionChecker> _logger;

    public N8nConnectionChecker(HttpClient httpClient, ILogger<N8nConnectionChecker> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<EmailConnectionStatus> CheckAsync(string webhookUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Head, webhookUrl);
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            return EmailConnectionStatus.Reachable;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "n8n webhook connection check failed for {WebhookUrl}", webhookUrl);
            return EmailConnectionStatus.Unreachable;
        }
    }
}
