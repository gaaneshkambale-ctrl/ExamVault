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
// Real Email Settings > N8n Webhook URL override - Platform Settings'
// N8nWebhookUrl controls specifically THIS credential-email webhook (the
// one real, editable "where do emails go" knob this pass wires up), not
// NotificationService's own separate notify webhook, which still only
// reads its static appsettings config - flagged honestly rather than
// silently claiming this affects all platform email.
public class N8nEmailDispatcher : IEmailDispatcher
{
    private readonly HttpClient _httpClient;
    private readonly N8nSettings _settings;
    private readonly IPlatformSettingsRepository _platformSettingsRepository;
    private readonly ILogger<N8nEmailDispatcher> _logger;

    public N8nEmailDispatcher(
        HttpClient httpClient,
        IOptions<N8nSettings> settings,
        IPlatformSettingsRepository platformSettingsRepository,
        ILogger<N8nEmailDispatcher> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _platformSettingsRepository = platformSettingsRepository;
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

            var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);
            var webhookUrl = !string.IsNullOrWhiteSpace(platformSettings?.N8nWebhookUrl)
                ? platformSettings.N8nWebhookUrl
                : _settings.WebhookUrl;

            var response = await _httpClient.PostAsJsonAsync(webhookUrl, payload, cancellationToken);
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
