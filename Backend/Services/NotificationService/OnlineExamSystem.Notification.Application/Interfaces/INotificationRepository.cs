using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public record NotificationBatchSummary(
    Guid BatchId,
    string Title,
    NotificationType Type,
    int RecipientCount,
    DateTime SentAtUtc,
    DateTime? ScheduledAtUtc,
    Guid? CreatedByAdminUserId,
    int Delivered,
    int Failed,
    int Skipped,
    int Pending,
    bool HasInApp,
    bool HasEmail,
    Guid TenantId);

public record NotificationHistoryStats(int SentToday, int Delivered, int Failed, int Scheduled, int Total, int Pending);

public record NotificationBatchDetails(
    Guid BatchId,
    string Title,
    string Message,
    NotificationType Type,
    Guid? RelatedExamId,
    DateTime SentAtUtc,
    DateTime? ScheduledAtUtc,
    Guid? CreatedByAdminUserId,
    int TotalRecipients,
    int Delivered,
    int Failed,
    int Pending,
    int Skipped);

public interface INotificationRepository
{
    Task<(IReadOnlyList<NotificationEntity> Items, int TotalCount)> GetMineAsync(
        Guid userId,
        bool unreadOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<NotificationEntity>> GetUnreadForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task RemoveAsync(NotificationEntity notification, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<NotificationBatchSummary> Items, int TotalCount)> GetHistoryAsync(
        NotificationType? type,
        string? search,
        string? channel,
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<NotificationHistoryStats> GetHistoryStatsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<NotificationEntity>> GetByBatchIdAsync(
        Guid batchId,
        CancellationToken cancellationToken = default);

    Task RemoveBatchAsync(Guid batchId, CancellationToken cancellationToken = default);

    Task<NotificationPreference?> GetPreferenceAsync(
        Guid userId,
        NotificationType type,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<NotificationPreference>> GetPreferencesAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task UpsertPreferenceAsync(NotificationPreference preference, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
