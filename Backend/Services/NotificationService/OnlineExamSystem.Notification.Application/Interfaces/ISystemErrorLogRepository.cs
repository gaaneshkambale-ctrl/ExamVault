using OnlineExamSystem.Notification.Domain.Entities;
using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface ISystemErrorLogRepository
{
    Task AddAsync(SystemErrorLog entry, CancellationToken cancellationToken = default);

    Task<SystemErrorLog?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SystemErrorLog>> GetAsync(
        DateTime fromUtc,
        DateTime toUtc,
        string? service,
        SystemLogLevel? severity,
        bool? isResolved,
        int take,
        CancellationToken cancellationToken = default);

    /// <summary>Deletes every SystemErrorLog row older than the cutoff - the fixed
    /// 30-day retention cleanup job's write. Returns the number of rows removed.</summary>
    Task<int> DeleteOlderThanAsync(DateTime cutoffUtc, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
