namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record CreateNotificationResponse(Guid BatchId, int RecipientCount);

public record NotificationBatchSummaryResponse(
    Guid BatchId,
    string Title,
    string Type,
    int RecipientCount,
    DateTime SentAtUtc,
    DateTime? ScheduledAtUtc,
    string Status,
    int Delivered,
    int Failed,
    int Skipped,
    int Pending,
    string Channels,
    // Only meaningful for a Super Admin's cross-tenant Notification
    // History/Platform Announcement views.
    Guid TenantId,
    Guid? CreatedByAdminUserId);

public record NotificationHistoryResponse(
    IReadOnlyList<NotificationBatchSummaryResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record NotificationHistoryStatsResponse(int SentToday, int Delivered, int Failed, int Scheduled, int Total, int Pending);

public record NotificationBatchDetailsResponse(
    Guid BatchId,
    string Title,
    string Message,
    string Type,
    Guid? RelatedExamId,
    DateTime SentAtUtc,
    DateTime? ScheduledAtUtc,
    string Status,
    int TotalRecipients,
    int Delivered,
    int Failed,
    int Pending,
    int Skipped);

public record ResendNotificationResponse(Guid NewBatchId, int RecipientCount);
