using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace OnlineExamSystem.Notification.Infrastructure.Email;

public class N8nEmailDispatcher : IEmailDispatcher
{
    private readonly HttpClient _httpClient;
    private readonly N8nSettings _settings;
    private readonly ILogger<N8nEmailDispatcher> _logger;

    public N8nEmailDispatcher(HttpClient httpClient, IOptions<N8nSettings> settings, ILogger<N8nEmailDispatcher> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<bool> SendAsync(
        string toEmail,
        string toName,
        string subject,
        string body,
        string type,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new
            {
                toEmail,
                toName,
                subject,
                body,
                type,
                notificationId,
            };

            var response = await _httpClient.PostAsJsonAsync(_settings.WebhookUrl, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "n8n webhook returned {StatusCode} for notification {NotificationId}",
                    response.StatusCode, notificationId);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            // Email is a best-effort side channel, never the reason an in-app
            // notification fails to persist - swallow and report failure.
            _logger.LogWarning(ex, "n8n webhook call failed for notification {NotificationId}", notificationId);
            return false;
        }
    }
}
