using OnlineExamSystem.Notification.Application.Interfaces;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistoryStats;

public class GetNotificationHistoryStatsHandler
{
    private readonly INotificationRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public GetNotificationHistoryStatsHandler(INotificationRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
    }

    public async Task<NotificationHistoryStats> HandleAsync(
        GetNotificationHistoryStatsQuery query,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Guid>? ownedExamIds = null;
        if (query.OwnerUserId is not null)
        {
            ownedExamIds = await _examLookupClient.GetOwnedExamIdsAsync(query.BearerToken, cancellationToken);
        }

        return await _repository.GetHistoryStatsAsync(ownedExamIds, cancellationToken);
    }
}
