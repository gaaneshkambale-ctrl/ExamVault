using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.GetNotificationById;

public class GetNotificationByIdResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsForbidden { get; init; }
    public NotificationEntity? Notification { get; init; }

    public static GetNotificationByIdResult Ok(NotificationEntity notification) =>
        new() { Success = true, Notification = notification };

    public static GetNotificationByIdResult NotFound() => new() { IsNotFound = true };

    public static GetNotificationByIdResult Forbidden() => new() { IsForbidden = true };
}
