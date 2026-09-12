namespace OnlineExamSystem.Notification.Application.Interfaces;

public record NotificationDefaults(bool InAppEnabled, bool EmailEnabled);

/// <summary>Real Notification Settings > "Enable In-App/Email Notifications"
/// platform-wide defaults - hits UserService's anonymous internal-only
/// /internal/platform-settings/notification-defaults endpoint, since
/// PlatformSettings lives in UserService's own database.</summary>
public interface INotificationDefaultsClient
{
    Task<NotificationDefaults> GetDefaultsAsync(CancellationToken cancellationToken = default);
}
