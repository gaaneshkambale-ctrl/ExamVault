using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public class GetMyPreferencesHandler
{
    private readonly INotificationRepository _repository;
    private readonly INotificationDefaultsClient _defaultsClient;

    public GetMyPreferencesHandler(INotificationRepository repository, INotificationDefaultsClient defaultsClient)
    {
        _repository = repository;
        _defaultsClient = defaultsClient;
    }

    public async Task<IReadOnlyList<NotificationPreferenceItem>> HandleAsync(
        GetMyPreferencesQuery query,
        CancellationToken cancellationToken = default)
    {
        var saved = await _repository.GetPreferencesAsync(query.UserId, cancellationToken);
        var savedByType = saved.ToDictionary(p => p.Type);

        // Real Notification Settings > "Enable In-App/Email Notifications"
        // platform-wide defaults - only applies to a NotificationType this
        // user has never explicitly set their own preference for.
        var defaults = await _defaultsClient.GetDefaultsAsync(cancellationToken);

        return Enum.GetValues<NotificationType>()
            .Select(type => savedByType.TryGetValue(type, out var preference)
                ? new NotificationPreferenceItem(type, preference.InAppEnabled, preference.EmailEnabled)
                : new NotificationPreferenceItem(type, defaults.InAppEnabled, defaults.EmailEnabled))
            .ToList();
    }
}
