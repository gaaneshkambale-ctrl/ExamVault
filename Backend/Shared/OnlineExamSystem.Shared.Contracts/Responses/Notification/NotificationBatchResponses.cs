namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record CreateNotificationResponse(Guid BatchId, int RecipientCount);

public record NotificationBatchSummaryResponse(
    Guid BatchId,
    string Title,
    string Type,
    int RecipientCount,
    DateTime SentAtUtc,
    DateTime? ScheduledAtUtc,
    string Status);

public record NotificationHistoryResponse(
    IReadOnlyList<NotificationBatchSummaryResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

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
    int Pending);

public record ResendNotificationResponse(Guid NewBatchId, int RecipientCount);
