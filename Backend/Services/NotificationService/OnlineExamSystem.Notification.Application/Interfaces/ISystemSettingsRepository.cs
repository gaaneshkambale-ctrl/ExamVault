using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Application.Interfaces;

public interface ISystemSettingsRepository
{
    /// <summary>Returns the caller's own tenant's SystemSettings row (scoped by the
    /// ambient query filter), creating it with the entity's own defaults if it doesn't
    /// exist yet. For the authenticated HTTP path only.</summary>
    Task<SystemSettings> GetOrCreateAsync(CancellationToken cancellationToken = default);

    /// <summary>Same as above but for an explicitly-given tenant, bypassing the ambient
    /// query filter - the audit log retention cleanup job has no authenticated caller/
    /// current tenant of its own, so it must check each tenant's settings explicitly.</summary>
    Task<SystemSettings> GetOrCreateForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
