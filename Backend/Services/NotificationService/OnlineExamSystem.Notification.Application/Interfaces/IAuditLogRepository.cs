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

    /// <summary>Distinct TenantIds with at least one AuditLog row, bypassing the ambient
    /// query filter - the retention cleanup job has no tenant of its own and needs to
    /// enforce each tenant's own retention setting individually rather than one global
    /// cutoff, so it must discover which tenants actually have rows to clean up.</summary>
    Task<IReadOnlyList<Guid>> GetDistinctTenantIdsAsync(CancellationToken cancellationToken = default);

    /// <summary>Deletes every AuditLog row for the given tenant older than the cutoff -
    /// the retention-policy cleanup job's write. Returns the number of rows removed.</summary>
    Task<int> DeleteOlderThanAsync(Guid tenantId, DateTime cutoffUtc, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
