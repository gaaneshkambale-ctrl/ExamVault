using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;

public class GetNotificationHistoryHandler
{
    private readonly INotificationRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public GetNotificationHistoryHandler(INotificationRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
    }

    public async Task<(IReadOnlyList<NotificationBatchSummary> Items, int TotalCount)> HandleAsync(
        GetNotificationHistoryQuery query,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Guid>? ownedExamIds = null;
        if (query.OwnerUserId is not null)
        {
            ownedExamIds = await _examLookupClient.GetOwnedExamIdsAsync(query.BearerToken, cancellationToken);
        }

        return await _repository.GetHistoryAsync(
            query.Type, query.Search, query.Channel, query.Status, query.Page, query.PageSize, ownedExamIds, cancellationToken);
    }
}
