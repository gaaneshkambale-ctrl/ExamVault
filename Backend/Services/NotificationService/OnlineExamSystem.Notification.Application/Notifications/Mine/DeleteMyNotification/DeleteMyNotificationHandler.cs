using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;

public class DeleteMyNotificationHandler
{
    private readonly INotificationRepository _repository;

    public DeleteMyNotificationHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<DeleteMyNotificationResult> HandleAsync(
        DeleteMyNotificationCommand command,
        CancellationToken cancellationToken = default)
    {
        var notification = await _repository.GetByIdAsync(command.NotificationId, cancellationToken);
        if (notification is null)
        {
            return DeleteMyNotificationResult.NotFound();
        }

        if (notification.UserId != command.UserId)
        {
            return DeleteMyNotificationResult.Forbidden();
        }

        await _repository.RemoveAsync(notification, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return DeleteMyNotificationResult.Ok();
    }
}
