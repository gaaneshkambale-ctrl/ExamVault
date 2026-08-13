using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class NotificationRepository : INotificationRepository
{
    private readonly NotificationDbContext _dbContext;

    public NotificationRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<(IReadOnlyList<NotificationEntity> Items, int TotalCount)> GetMineAsync(
        Guid userId,
        bool unreadOnly,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications
            .Where(n => n.UserId == userId)
            .Where(n => n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow);

        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .Where(n => n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow)
            .CountAsync(cancellationToken);

    public Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);

    public Task<IReadOnlyList<NotificationEntity>> GetUnreadForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .Where(n => n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow)
            .ToListAsync(cancellationToken)
            .ContinueWith(t => (IReadOnlyList<NotificationEntity>)t.Result, cancellationToken);

    public Task RemoveAsync(NotificationEntity notification, CancellationToken cancellationToken = default)
    {
        _dbContext.Notifications.Remove(notification);
        return Task.CompletedTask;
    }

    public async Task<(IReadOnlyList<NotificationBatchSummary> Items, int TotalCount)> GetHistoryAsync(
        NotificationType? type,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications.AsQueryable();
        if (type.HasValue)
        {
            query = query.Where(n => n.Type == type.Value);
        }

        var grouped = query
            .GroupBy(n => n.BatchId)
            .Select(g => new
            {
                BatchId = g.Key,
                Title = g.Min(n => n.Title),
                Type = g.Min(n => n.Type),
                RecipientCount = g.Count(),
                SentAtUtc = g.Min(n => n.CreatedAtUtc),
                ScheduledAtUtc = g.Min(n => n.ScheduledAtUtc),
                CreatedByAdminUserId = g.Min(n => n.CreatedByAdminUserId),
            });

        var totalCount = await grouped.CountAsync(cancellationToken);
        var items = await grouped
            .OrderByDescending(g => g.SentAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var summaries = items
            .Select(i => new NotificationBatchSummary(
                i.BatchId, i.Title!, i.Type, i.RecipientCount, i.SentAtUtc, i.ScheduledAtUtc, i.CreatedByAdminUserId))
            .ToList();

        return (summaries, totalCount);
    }

    public Task<IReadOnlyList<NotificationEntity>> GetByBatchIdAsync(
        Guid batchId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Notifications
            .Where(n => n.BatchId == batchId)
            .ToListAsync(cancellationToken)
            .ContinueWith(t => (IReadOnlyList<NotificationEntity>)t.Result, cancellationToken);

    public async Task RemoveBatchAsync(Guid batchId, CancellationToken cancellationToken = default)
    {
        var rows = await _dbContext.Notifications.Where(n => n.BatchId == batchId).ToListAsync(cancellationToken);
        _dbContext.Notifications.RemoveRange(rows);
    }

    public Task<NotificationPreference?> GetPreferenceAsync(
        Guid userId,
        NotificationType type,
        CancellationToken cancellationToken = default) =>
        _dbContext.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Type == type, cancellationToken);

    public Task<IReadOnlyList<NotificationPreference>> GetPreferencesAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.NotificationPreferences
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken)
            .ContinueWith(t => (IReadOnlyList<NotificationPreference>)t.Result, cancellationToken);

    public Task UpsertPreferenceAsync(NotificationPreference preference, CancellationToken cancellationToken = default)
    {
        _dbContext.NotificationPreferences.Add(preference);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
