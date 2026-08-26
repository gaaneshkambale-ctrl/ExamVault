namespace OnlineExamSystem.Notification.Application.Notifications.Admin.DeleteNotificationBatch;

public class DeleteNotificationBatchResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }

    public static DeleteNotificationBatchResult Ok() => new() { Success = true };

    public static DeleteNotificationBatchResult NotFound() => new() { IsNotFound = true };
}
