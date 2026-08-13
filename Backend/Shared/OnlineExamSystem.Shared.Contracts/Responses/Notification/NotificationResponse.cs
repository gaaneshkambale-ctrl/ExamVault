namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record NotificationResponse(
    Guid Id,
    string Type,
    string Title,
    string Message,
    bool IsRead,
    Guid? RelatedExamId,
    string EmailStatus,
    DateTime CreatedAtUtc);

public record NotificationListResponse(
    IReadOnlyList<NotificationResponse> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record UnreadCountResponse(int Count);
