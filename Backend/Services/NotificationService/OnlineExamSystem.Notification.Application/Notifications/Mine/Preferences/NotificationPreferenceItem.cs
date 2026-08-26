using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public record NotificationPreferenceItem(NotificationType Type, bool InAppEnabled, bool EmailEnabled);
