using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;

public class GetNotificationBatchDetailsHandler
{
    private readonly INotificationRepository _repository;

    public GetNotificationBatchDetailsHandler(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<GetNotificationBatchDetailsResult> HandleAsync(
        GetNotificationBatchDetailsQuery query,
        CancellationToken cancellationToken = default)
    {
        var rows = await _repository.GetByBatchIdAsync(query.BatchId, cancellationToken);
        if (rows.Count == 0)
        {
            return GetNotificationBatchDetailsResult.NotFound();
        }

        var first = rows[0];
        var details = new NotificationBatchDetails(
            BatchId: query.BatchId,
            Title: first.Title,
            Message: first.Message,
            Type: first.Type,
            RelatedExamId: first.RelatedExamId,
            SentAtUtc: rows.Min(r => r.CreatedAtUtc),
            ScheduledAtUtc: first.ScheduledAtUtc,
            CreatedByAdminUserId: first.CreatedByAdminUserId,
            TotalRecipients: rows.Count,
            Delivered: rows.Count(r => r.EmailStatus == EmailStatus.Delivered),
            Failed: rows.Count(r => r.EmailStatus == EmailStatus.Failed),
            Pending: rows.Count(r => r.EmailStatus == EmailStatus.Pending));

        return GetNotificationBatchDetailsResult.Ok(details);
    }
}
