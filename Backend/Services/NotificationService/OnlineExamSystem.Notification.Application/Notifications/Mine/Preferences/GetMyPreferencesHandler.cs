using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public class GetMyPreferencesHandler
{
    private readonly INotificationRepository _repository;

    public GetMyPreferencesHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<NotificationPreferenceItem>> HandleAsync(
        GetMyPreferencesQuery query,
        CancellationToken cancellationToken = default)
    {
        var saved = await _repository.GetPreferencesAsync(query.UserId, cancellationToken);
        var savedByType = saved.ToDictionary(p => p.Type);

        return Enum.GetValues<NotificationType>()
            .Select(type => savedByType.TryGetValue(type, out var preference)
                ? new NotificationPreferenceItem(type, preference.InAppEnabled, preference.EmailEnabled)
                : new NotificationPreferenceItem(type, InAppEnabled: true, EmailEnabled: true))
            .ToList();
    }
}
