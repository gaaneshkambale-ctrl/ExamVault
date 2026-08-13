namespace OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;

public class CreateNotificationResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public bool IsNoRecipients { get; init; }
    public Guid BatchId { get; init; }
    public int RecipientCount { get; init; }

    public static CreateNotificationResult Ok(Guid batchId, int recipientCount) =>
        new() { Success = true, BatchId = batchId, RecipientCount = recipientCount };

    public static CreateNotificationResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };

    public static CreateNotificationResult NoRecipients() => new() { IsNoRecipients = true };
}
