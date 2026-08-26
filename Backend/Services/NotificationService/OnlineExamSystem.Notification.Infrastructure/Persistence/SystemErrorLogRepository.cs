using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class SystemErrorLogRepository : ISystemErrorLogRepository
{
    private readonly NotificationDbContext _dbContext;

    public SystemErrorLogRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(SystemErrorLog entry, CancellationToken cancellationToken = default)
    {
        _dbContext.SystemErrorLogs.Add(entry);
        return Task.CompletedTask;
    }

    public Task<SystemErrorLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.SystemErrorLogs.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public async Task<IReadOnlyList<SystemErrorLog>> GetAsync(
        DateTime fromUtc,
        DateTime toUtc,
        string? service,
        SystemLogLevel? severity,
        bool? isResolved,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.SystemErrorLogs
            .Where(e => e.CreatedAtUtc >= fromUtc && e.CreatedAtUtc <= toUtc);

        if (!string.IsNullOrWhiteSpace(service))
        {
            query = query.Where(e => e.Service == service);
        }

        if (severity.HasValue)
        {
            query = query.Where(e => e.Severity == severity.Value);
        }

        if (isResolved.HasValue)
        {
            query = query.Where(e => e.IsResolved == isResolved.Value);
        }

        return await query
            .OrderByDescending(e => e.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task<int> DeleteOlderThanAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default) =>
        _dbContext.SystemErrorLogs
            .Where(e => e.CreatedAtUtc < cutoffUtc)
            .ExecuteDeleteAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
