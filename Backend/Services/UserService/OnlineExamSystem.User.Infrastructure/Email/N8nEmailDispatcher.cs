using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Infrastructure.Email;

// Small per-service copy of Notification.Infrastructure's N8nEmailDispatcher,
// pointed at a SEPARATE n8n webhook path (examvault/notify-credential) that
// skips the AI rewrite step entirely - a temporary password is an exact
// string the user must retype correctly, and the shared notify webhook's AI
// Agent has already proven inconsistent about preserving text verbatim.
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
        string? loginUrl = null,
        string? tenantSlug = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var payload = new { toEmail, toName, subject, body, loginUrl, tenantSlug };

            var response = await _httpClient.PostAsJsonAsync(_settings.WebhookUrl, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "n8n credential-email webhook returned {StatusCode} for {ToEmail}",
                    response.StatusCode, toEmail);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "n8n credential-email webhook call failed for {ToEmail}", toEmail);
            return false;
        }
    }
}
