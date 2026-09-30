using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Infrastructure.Clients;

public class NotificationDefaultsClient : INotificationDefaultsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly NotificationDefaults FallbackDefaults = new(true, true);

    private readonly HttpClient _httpClient;
    private readonly ILogger<NotificationDefaultsClient> _logger;

    public NotificationDefaultsClient(HttpClient httpClient, ILogger<NotificationDefaultsClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    // Fails open to the same true/true this codebase always defaulted to -
    // a transient cross-service failure must never block a user from
    // reading their own notification preferences.
    public async Task<NotificationDefaults> GetDefaultsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("internal/platform-settings/notification-defaults", cancellationToken);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<NotificationDefaultsApiResponse>(JsonOptions, cancellationToken);
            return body is null ? FallbackDefaults : new NotificationDefaults(body.DefaultInAppEnabled, body.DefaultEmailEnabled);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Couldn't reach UserService for notification defaults - using true/true.");
            return FallbackDefaults;
        }
    }

    private sealed class NotificationDefaultsApiResponse
    {
        public bool DefaultInAppEnabled { get; init; } = true;
        public bool DefaultEmailEnabled { get; init; } = true;
    }
}
