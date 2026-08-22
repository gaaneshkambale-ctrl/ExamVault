using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly NotificationDbContext _dbContext;

    public AuditLogRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(AuditLog entry, CancellationToken cancellationToken = default)
    {
        _dbContext.AuditLogs.Add(entry);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<AuditLog>> GetAsync(
        DateTime fromUtc,
        DateTime toUtc,
        AuditModule? module,
        Guid? userId,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.AuditLogs
            .Where(a => a.CreatedAtUtc >= fromUtc && a.CreatedAtUtc <= toUtc);

        if (module.HasValue)
        {
            query = query.Where(a => a.Module == module.Value);
        }

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        return await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
