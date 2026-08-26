using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;

public class MarkAsReadHandler
{
    private readonly INotificationRepository _repository;

    public MarkAsReadHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<MarkAsReadResult> HandleAsync(
        MarkAsReadCommand command,
        CancellationToken cancellationToken = default)
    {
        var notification = await _repository.GetByIdAsync(command.NotificationId, cancellationToken);
        if (notification is null)
        {
            return MarkAsReadResult.NotFound();
        }

        if (notification.UserId != command.UserId)
        {
            return MarkAsReadResult.Forbidden();
        }

        notification.IsRead = true;
        await _repository.SaveChangesAsync(cancellationToken);

        return MarkAsReadResult.Ok(notification);
    }
}
