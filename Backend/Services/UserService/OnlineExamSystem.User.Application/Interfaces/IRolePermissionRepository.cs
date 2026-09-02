using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IRolePermissionRepository
{
    /// <summary>All of the caller's tenant's role-permission rows (query-filtered).
    /// Empty means this tenant has never touched the feature yet.</summary>
    Task<IReadOnlyList<RolePermission>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddRangeAsync(IReadOnlyList<RolePermission> rows, CancellationToken cancellationToken = default);

    /// <summary>Deletes every existing row for this role (within the caller's
    /// tenant) and inserts one row per given permission key.</summary>
    Task ReplaceForRoleAsync(
        Guid tenantId,
        string role,
        IReadOnlyList<string> permissionKeys,
        CancellationToken cancellationToken = default);

    /// <summary>Permission keys currently granted to this role within this tenant -
    /// used at login/token-refresh to embed permission claims. Explicitly
    /// tenant-scoped via an explicit parameter + IgnoreQueryFilters (not the
    /// ambient HasQueryFilter), since this runs before authentication exists,
    /// same reasoning IUserRepository.GetByEmailAsync already takes an explicit
    /// tenantId instead of relying on ICurrentTenant. Falls back to the
    /// catalog's defaults only if this tenant has never touched the feature at
    /// all (zero rows for ANY role) - distinct from a role deliberately
    /// revoked to zero, which returns an empty list as-is, matching
    /// GetAllRolePermissionsHandler's existing seed-vs-revoked distinction.</summary>
    Task<IReadOnlyList<string>> GetForRoleAsync(Guid tenantId, string role, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
