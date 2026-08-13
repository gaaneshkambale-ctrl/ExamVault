using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAllAsRead;

public class MarkAllAsReadHandler
{
    private readonly INotificationRepository _repository;

    public MarkAllAsReadHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<int> HandleAsync(MarkAllAsReadCommand command, CancellationToken cancellationToken = default)
    {
        var unread = await _repository.GetUnreadForUserAsync(command.UserId, cancellationToken);
        foreach (var notification in unread)
        {
            notification.IsRead = true;
        }

        if (unread.Count > 0)
        {
            await _repository.SaveChangesAsync(cancellationToken);
        }

        return unread.Count;
    }
}
