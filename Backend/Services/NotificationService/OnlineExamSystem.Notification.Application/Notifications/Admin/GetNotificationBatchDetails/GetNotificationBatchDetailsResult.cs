using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;

public class GetNotificationBatchDetailsResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public NotificationBatchDetails? Details { get; init; }

    public static GetNotificationBatchDetailsResult Ok(NotificationBatchDetails details) =>
        new() { Success = true, Details = details };

    public static GetNotificationBatchDetailsResult NotFound() => new() { IsNotFound = true };
}
