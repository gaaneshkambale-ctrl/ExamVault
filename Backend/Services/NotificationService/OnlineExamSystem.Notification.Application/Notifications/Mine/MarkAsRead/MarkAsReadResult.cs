using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;

public class MarkAsReadResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public NotificationEntity? Notification { get; init; }

    public static MarkAsReadResult Ok(NotificationEntity notification) => new() { Success = true, Notification = notification };

    public static MarkAsReadResult NotFound() => new() { IsNotFound = true };

    public static MarkAsReadResult Forbidden() => new() { IsForbidden = true };
}
