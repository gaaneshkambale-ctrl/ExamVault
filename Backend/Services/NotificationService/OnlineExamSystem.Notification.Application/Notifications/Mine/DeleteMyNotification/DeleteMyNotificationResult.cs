namespace OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;

public class DeleteMyNotificationResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public bool IsForbidden { get; init; }

    public static DeleteMyNotificationResult Ok() => new() { Success = true };

    public static DeleteMyNotificationResult NotFound() => new() { IsNotFound = true };

    public static DeleteMyNotificationResult Forbidden() => new() { IsForbidden = true };
}
