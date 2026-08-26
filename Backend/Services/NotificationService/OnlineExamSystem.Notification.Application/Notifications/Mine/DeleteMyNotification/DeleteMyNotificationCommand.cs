namespace OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;

public record DeleteMyNotificationCommand(Guid NotificationId, Guid UserId);
