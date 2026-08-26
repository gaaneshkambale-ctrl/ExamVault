using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.GetNotificationById;

public class GetNotificationByIdHandler
{
    private readonly INotificationRepository _repository;

    public GetNotificationByIdHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<GetNotificationByIdResult> HandleAsync(
        GetNotificationByIdQuery query,
        CancellationToken cancellationToken = default)
    {
        var notification = await _repository.GetByIdAsync(query.NotificationId, cancellationToken);
        if (notification is null)
        {
            return GetNotificationByIdResult.NotFound();
        }

        if (notification.UserId != query.UserId)
        {
            return GetNotificationByIdResult.Forbidden();
        }

        return GetNotificationByIdResult.Ok(notification);
    }
}
