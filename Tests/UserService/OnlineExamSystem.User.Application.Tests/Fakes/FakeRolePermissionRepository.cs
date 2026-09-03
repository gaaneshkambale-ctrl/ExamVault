using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.RolePermissions;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeRolePermissionRepository : IRolePermissionRepository
{
    private readonly List<RolePermission> _rows = [];

    public Task<IReadOnlyList<RolePermission>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<RolePermission>>(_rows.ToList());

    public Task AddRangeAsync(IReadOnlyList<RolePermission> rows, CancellationToken cancellationToken = default)
    {
        _rows.AddRange(rows);
        return Task.CompletedTask;
    }

    public Task ReplaceForRoleAsync(
        Guid tenantId,
        string role,
        IReadOnlyList<string> permissionKeys,
        DateTime updatedAtUtc,
        CancellationToken cancellationToken = default)
    {
        _rows.RemoveAll(rp => rp.TenantId == tenantId && rp.Role == role);
        _rows.AddRange(permissionKeys.Select(key => new RolePermission { TenantId = tenantId, Role = role, PermissionKey = key, UpdatedAtUtc = updatedAtUtc }));
        return Task.CompletedTask;
    }

    // No rows stored for this tenant at all -> catalog defaults, same
    // "never touched the feature yet" fallback the real repository uses.
    public Task<IReadOnlyList<string>> GetForRoleAsync(Guid tenantId, string role, CancellationToken cancellationToken = default)
    {
        if (!_rows.Any(rp => rp.TenantId == tenantId))
        {
            return Task.FromResult(RolePermissionCatalog.DefaultsForRole(role));
        }

        IReadOnlyList<string> keys = _rows
            .Where(rp => rp.TenantId == tenantId && rp.Role == role)
            .Select(rp => rp.PermissionKey)
            .ToList();
        return Task.FromResult(keys);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
