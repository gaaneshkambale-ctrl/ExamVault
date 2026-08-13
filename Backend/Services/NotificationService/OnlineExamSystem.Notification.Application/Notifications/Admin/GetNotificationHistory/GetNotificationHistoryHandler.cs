using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;

public class GetNotificationHistoryHandler
{
    private readonly INotificationRepository _repository;

    public GetNotificationHistoryHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public Task<(IReadOnlyList<NotificationBatchSummary> Items, int TotalCount)> HandleAsync(
        GetNotificationHistoryQuery query,
        CancellationToken cancellationToken = default) =>
        _repository.GetHistoryAsync(query.Type, query.Page, query.PageSize, cancellationToken);
}
