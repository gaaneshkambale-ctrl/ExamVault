using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Application.Tests.Fakes;

public class FakeNotificationRepository : INotificationRepository
{
    private readonly List<NotificationEntity> _notifications = [];
    private readonly List<NotificationPreference> _preferences = [];

    public IReadOnlyList<NotificationEntity> Notifications => _notifications;

    public void Seed(NotificationEntity notification) => _notifications.Add(notification);

    public void Seed(NotificationPreference preference) => _preferences.Add(preference);

    public Task<(IReadOnlyList<NotificationEntity> Items, int TotalCount)> GetMineAsync(
        Guid userId,
        bool unreadOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _notifications
            .Where(n => n.UserId == userId)
            .Where(n => n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow);

        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var all = query.OrderByDescending(n => n.CreatedAtUtc).ToList();
        var page1 = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Task.FromResult<(IReadOnlyList<NotificationEntity>, int)>((page1, all.Count));
    }

    public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_notifications.Count(n =>
            n.UserId == userId && !n.IsRead && (n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow)));

    public Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_notifications.FirstOrDefault(n => n.Id == id));

    public Task<IReadOnlyList<NotificationEntity>> GetUnreadForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<NotificationEntity>>(
            _notifications.Where(n => n.UserId == userId && !n.IsRead).ToList());

    public Task RemoveAsync(NotificationEntity notification, CancellationToken cancellationToken = default)
    {
        _notifications.Remove(notification);
        return Task.CompletedTask;
    }

    public Task<(IReadOnlyList<NotificationBatchSummary> Items, int TotalCount)> GetHistoryAsync(
        NotificationType? type,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _notifications.AsEnumerable();
        if (type.HasValue)
        {
            query = query.Where(n => n.Type == type.Value);
        }

        var grouped = query
            .GroupBy(n => n.BatchId)
            .Select(g => new NotificationBatchSummary(
                g.Key,
                g.First().Title,
                g.First().Type,
                g.Count(),
                g.Min(n => n.CreatedAtUtc),
                g.First().ScheduledAtUtc,
                g.First().CreatedByAdminUserId))
            .OrderByDescending(s => s.SentAtUtc)
            .ToList();

        var page1 = grouped.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Task.FromResult<(IReadOnlyList<NotificationBatchSummary>, int)>((page1, grouped.Count));
    }

    public Task<IReadOnlyList<NotificationEntity>> GetByBatchIdAsync(
        Guid batchId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<NotificationEntity>>(
            _notifications.Where(n => n.BatchId == batchId).ToList());

    public Task RemoveBatchAsync(Guid batchId, CancellationToken cancellationToken = default)
    {
        _notifications.RemoveAll(n => n.BatchId == batchId);
        return Task.CompletedTask;
    }

    public Task<NotificationPreference?> GetPreferenceAsync(
        Guid userId,
        NotificationType type,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_preferences.FirstOrDefault(p => p.UserId == userId && p.Type == type));

    public Task<IReadOnlyList<NotificationPreference>> GetPreferencesAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<NotificationPreference>>(
            _preferences.Where(p => p.UserId == userId).ToList());

    public Task UpsertPreferenceAsync(NotificationPreference preference, CancellationToken cancellationToken = default)
    {
        _preferences.Add(preference);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
