using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Mine.GetUnreadCount;

public class GetUnreadCountHandler
{
    private readonly INotificationRepository _repository;

    public GetUnreadCountHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public Task<int> HandleAsync(GetUnreadCountQuery query, CancellationToken cancellationToken = default) =>
        _repository.GetUnreadCountAsync(query.UserId, cancellationToken);
}
