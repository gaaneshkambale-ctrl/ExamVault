using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IRolePermissionRepository
{
    /// <summary>All of the caller's tenant's role-permission rows (query-filtered).
    /// Empty means this tenant has never touched the feature yet.</summary>
    Task<IReadOnlyList<RolePermission>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddRangeAsync(IReadOnlyList<RolePermission> rows, CancellationToken cancellationToken = default);

    /// <summary>Diffs this role's rows (within the caller's tenant) against the
    /// given permission keys - removing rows no longer desired, adding rows for
    /// new keys, and leaving unchanged rows' Id/CreatedAtUtc untouched.
    /// updatedAtUtc is stamped onto every row for the role (added and
    /// surviving alike), so a role's "last updated" is always the most recent
    /// save regardless of whether that save added, removed, or left permissions
    /// unchanged.</summary>
    Task ReplaceForRoleAsync(
        Guid tenantId,
        string role,
        IReadOnlyList<string> permissionKeys,
        DateTime updatedAtUtc,
        Guid updatedByUserId,
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

    /// <summary>Same permission keys as <see cref="GetForRoleAsync"/> plus this
    /// role's "last updated" metadata (max UpdatedAtUtc across its rows, and
    /// whichever row(s) share that max give the actor) - a separate method
    /// rather than widening GetForRoleAsync itself, since that one is called on
    /// every login/token-refresh and shouldn't carry the extra column reads.
    /// Null metadata means this role has never been explicitly saved (still on
    /// catalog defaults).</summary>
    Task<(IReadOnlyList<string> Permissions, DateTime? UpdatedAtUtc, Guid? UpdatedByUserId)> GetForRoleWithMetadataAsync(
        Guid tenantId, string role, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
