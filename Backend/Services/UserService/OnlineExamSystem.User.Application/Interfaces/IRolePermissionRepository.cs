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

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
