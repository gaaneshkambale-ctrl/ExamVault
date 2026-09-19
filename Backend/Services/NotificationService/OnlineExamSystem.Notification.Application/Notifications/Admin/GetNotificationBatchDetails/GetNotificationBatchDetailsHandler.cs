using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;

public class GetNotificationBatchDetailsHandler
{
    private readonly INotificationRepository _repository;
    private readonly IExamLookupClient _examLookupClient;

    public GetNotificationBatchDetailsHandler(INotificationRepository repository, IExamLookupClient examLookupClient)
    {
        _repository = repository;
        _examLookupClient = examLookupClient;
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

        // Instructor is restricted to batches for an exam they own - same
        // "return not-found" read-path convention used across this session
        // (GetExamHandler/GetAssignmentHandler) rather than a distinct 403.
        if (query.OwnerUserId is { } ownerUserId)
        {
            if (first.RelatedExamId is not { } relatedExamId)
            {
                return GetNotificationBatchDetailsResult.NotFound();
            }

            var exam = await _examLookupClient.GetExamAsync(relatedExamId, query.BearerToken, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return GetNotificationBatchDetailsResult.NotFound();
            }
        }
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
            Pending: rows.Count(r => r.EmailStatus == EmailStatus.Pending),
            Skipped: rows.Count(r => r.EmailStatus == EmailStatus.Skipped));

        return GetNotificationBatchDetailsResult.Ok(details);
    }
}
