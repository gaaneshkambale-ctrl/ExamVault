using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface IAuditLogRepository
{
    Task AddAsync(AuditLog entry, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLog>> GetAsync(
        DateTime fromUtc,
        DateTime toUtc,
        AuditModule? module,
        Guid? userId,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>Deletes every AuditLog row older than the cutoff - the retention-policy
    /// cleanup job's write. Returns the number of rows removed.</summary>
    Task<int> DeleteOlderThanAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
