namespace OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;

public record MarkAsReadCommand(Guid NotificationId, Guid UserId);
