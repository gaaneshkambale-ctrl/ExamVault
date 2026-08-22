using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistoryStats;

public class GetNotificationHistoryStatsHandler
{
    private readonly INotificationRepository _repository;

    public GetNotificationHistoryStatsHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public Task<NotificationHistoryStats> HandleAsync(
        GetNotificationHistoryStatsQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetHistoryStatsAsync(cancellationToken);
}
