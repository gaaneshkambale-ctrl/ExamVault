namespace OnlineExamSystem.Notification.Application.Interfaces;

// One recipient's worth of already-substituted email content, queued for a
// background worker to actually send - see NotificationPersistenceService's
// own comment for why this exists instead of sending inline.
public record NotificationDispatchItem(
    Guid NotificationId,
    string RecipientEmail,
    string RecipientName,
    string Title,
    string Message,
    string TypeName);

public interface INotificationDispatchQueue
{
    void Enqueue(NotificationDispatchItem item);

    IAsyncEnumerable<NotificationDispatchItem> ReadAllAsync(CancellationToken cancellationToken);
}
