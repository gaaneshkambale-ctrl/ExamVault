using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class RolePermissionRepository : IRolePermissionRepository
{
    private readonly UserDbContext _dbContext;

    public RolePermissionRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<RolePermission>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.RolePermissions.ToListAsync(cancellationToken);

    public async Task AddRangeAsync(IReadOnlyList<RolePermission> rows, CancellationToken cancellationToken = default) =>
        await _dbContext.RolePermissions.AddRangeAsync(rows, cancellationToken);

    public async Task ReplaceForRoleAsync(
        Guid tenantId,
        string role,
        IReadOnlyList<string> permissionKeys,
        CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.RolePermissions
            .Where(rp => rp.Role == role)
            .ToListAsync(cancellationToken);
        var desiredKeys = permissionKeys.ToHashSet();

        // Diff-based, not delete-all-then-reinsert-all: a permission that's
        // unchanged across a save (still checked, or still unchecked) never
        // gets touched, so its row is never deleted and reinserted with a
        // new Id in the same transaction - that pattern was fragile against
        // the (TenantId, Role, PermissionKey) unique index and is suspected
        // to have caused an unchanged permission to occasionally vanish.
        var toRemove = existing.Where(rp => !desiredKeys.Contains(rp.PermissionKey));
        _dbContext.RolePermissions.RemoveRange(toRemove);

        var existingKeys = existing.Select(rp => rp.PermissionKey).ToHashSet();
        var toAdd = desiredKeys.Where(key => !existingKeys.Contains(key));
        await _dbContext.RolePermissions.AddRangeAsync(
            toAdd.Select(key => new RolePermission { TenantId = tenantId, Role = role, PermissionKey = key }),
            cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
