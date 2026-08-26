namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public record SavePreferencesCommand(Guid UserId, IReadOnlyList<NotificationPreferenceItem> Preferences);
