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
            .Where(n => n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow)
            .Where(n => n.ShowInApp);

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
            .Where(n => n.ShowInApp)
            .CountAsync(cancellationToken);

    public Task<NotificationEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);

    public Task<IReadOnlyList<NotificationEntity>> GetUnreadForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .Where(n => n.ScheduledAtUtc == null || n.ScheduledAtUtc <= DateTime.UtcNow)
            .Where(n => n.ShowInApp)
            .ToListAsync(cancellationToken)
            .ContinueWith(t => (IReadOnlyList<NotificationEntity>)t.Result, cancellationToken);

    public Task RemoveAsync(NotificationEntity notification, CancellationToken cancellationToken = default)
    {
        _dbContext.Notifications.Remove(notification);
        return Task.CompletedTask;
    }

    public async Task<(IReadOnlyList<NotificationBatchSummary> Items, int TotalCount)> GetHistoryAsync(
        NotificationType? type,
        string? search,
        string? channel,
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications.AsQueryable();
        if (type.HasValue)
        {
            query = query.Where(n => n.Type == type.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(n => n.Title.Contains(search));
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
                Delivered = g.Count(n => n.EmailStatus == EmailStatus.Delivered),
                Failed = g.Count(n => n.EmailStatus == EmailStatus.Failed),
                Skipped = g.Count(n => n.EmailStatus == EmailStatus.Skipped),
                Pending = g.Count(n => n.EmailStatus == EmailStatus.Pending),
                HasInApp = g.Any(n => n.ShowInApp),
                HasEmail = g.Any(n => n.EmailStatus != EmailStatus.Skipped),
            });

        // Channel/status are derived from per-batch aggregates rather than
        // stored columns, so they're filtered here in memory after grouping
        // (batch counts, not recipient-row counts, so this stays small even
        // at real scale) rather than trying to push a derived predicate
        // through EF's SQL translation.
        var now = DateTime.UtcNow;
        var all = await grouped.ToListAsync(cancellationToken);

        var filtered = all.Where(i =>
        {
            var isScheduled = i.ScheduledAtUtc.HasValue && i.ScheduledAtUtc.Value > now;
            var statusLabel = i.Failed > 0 ? "Failed" : isScheduled ? "Scheduled" : "Delivered";
            if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, statusLabel, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(channel))
            {
                var channelLabel = (i.HasInApp, i.HasEmail) switch
                {
                    (true, true) => "InAppEmail",
                    (true, false) => "InApp",
                    (false, true) => "Email",
                    _ => "None",
                };
                if (!string.Equals(channel, channelLabel, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            return true;
        }).ToList();

        var totalCount = filtered.Count;
        var items = filtered
            .OrderByDescending(g => g.SentAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var summaries = items
            .Select(i => new NotificationBatchSummary(
                i.BatchId, i.Title!, i.Type, i.RecipientCount, i.SentAtUtc, i.ScheduledAtUtc, i.CreatedByAdminUserId,
                i.Delivered, i.Failed, i.Skipped, i.Pending, i.HasInApp, i.HasEmail))
            .ToList();

        return (summaries, totalCount);
    }

    public async Task<NotificationHistoryStats> GetHistoryStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var todayStartUtc = now.Date;

        var sentToday = await _dbContext.Notifications
            .Where(n => n.CreatedAtUtc >= todayStartUtc && n.EmailStatus != EmailStatus.Pending)
            .CountAsync(cancellationToken);
        var delivered = await _dbContext.Notifications
            .Where(n => n.EmailStatus == EmailStatus.Delivered)
            .CountAsync(cancellationToken);
        var failed = await _dbContext.Notifications
            .Where(n => n.EmailStatus == EmailStatus.Failed)
            .CountAsync(cancellationToken);
        var scheduled = await _dbContext.Notifications
            .Where(n => n.ScheduledAtUtc != null && n.ScheduledAtUtc > now)
            .CountAsync(cancellationToken);

        return new NotificationHistoryStats(sentToday, delivered, failed, scheduled);
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
