using OnlineExamSystem.Notification.Application.Interfaces;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;

public class GetMyNotificationsHandler
{
    private readonly INotificationRepository _repository;

    public GetMyNotificationsHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public Task<(IReadOnlyList<NotificationEntity> Items, int TotalCount)> HandleAsync(
        GetMyNotificationsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetMineAsync(query.UserId, query.UnreadOnly, query.Page, query.PageSize, cancellationToken);
}
