using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Infrastructure.Email;

public class N8nEmailDispatcher : IEmailDispatcher
{
    private readonly HttpClient _httpClient;
    private readonly N8nSettings _settings;
    private readonly IEmailDeliveryLogRepository _deliveryLogRepository;
    private readonly ILogger<N8nEmailDispatcher> _logger;

    public N8nEmailDispatcher(
        HttpClient httpClient,
        IOptions<N8nSettings> settings,
        IEmailDeliveryLogRepository deliveryLogRepository,
        ILogger<N8nEmailDispatcher> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _deliveryLogRepository = deliveryLogRepository;
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
                await TryLogAsync(toEmail, subject, success: false, $"HTTP {(int)response.StatusCode}", cancellationToken);
                return false;
            }

            await TryLogAsync(toEmail, subject, success: true, errorMessage: null, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            // Email is a best-effort side channel, never the reason an in-app
            // notification fails to persist - swallow and report failure.
            _logger.LogWarning(ex, "n8n webhook call failed for notification {NotificationId}", notificationId);
            await TryLogAsync(toEmail, subject, success: false, ex.Message, cancellationToken);
            return false;
        }
    }

    // Same reasoning as UserService's own copy - a logging hiccup must never
    // look like the email itself failed.
    private async Task TryLogAsync(string toEmail, string subject, bool success, string? errorMessage, CancellationToken cancellationToken)
    {
        try
        {
            await _deliveryLogRepository.LogAsync(toEmail, subject, success, errorMessage, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to record email delivery log for {ToEmail}", toEmail);
        }
    }
}
