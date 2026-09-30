using System.Threading.Channels;
using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Infrastructure.Email;

// Singleton in-process queue - the writer side runs inside a request-scoped
// NotificationPersistenceService, the reader side runs in
// NotificationDispatchBackgroundService, for the lifetime of the API
// process. Unbounded: a burst of large sends should never block or drop a
// caller's persistence call.
public class NotificationDispatchQueue : INotificationDispatchQueue
{
    private readonly Channel<NotificationDispatchItem> _channel = Channel.CreateUnbounded<NotificationDispatchItem>();

    public void Enqueue(NotificationDispatchItem item) => _channel.Writer.TryWrite(item);

    public IAsyncEnumerable<NotificationDispatchItem> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
