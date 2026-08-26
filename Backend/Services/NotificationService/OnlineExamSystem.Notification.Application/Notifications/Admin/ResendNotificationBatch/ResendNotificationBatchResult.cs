namespace OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;

public class ResendNotificationBatchResult
{
    public bool Success { get; init; }
    public bool IsNotFound { get; init; }
    public Guid NewBatchId { get; init; }
    public int RecipientCount { get; init; }

    public static ResendNotificationBatchResult Ok(Guid newBatchId, int recipientCount) =>
        new() { Success = true, NewBatchId = newBatchId, RecipientCount = recipientCount };

    public static ResendNotificationBatchResult NotFound() => new() { IsNotFound = true };
}
