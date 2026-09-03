using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.RolePermissions;
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
        // IgnoreQueryFilters() + explicit TenantId, matching GetForRoleAsync's
        // own pattern - this method is called both from the tenant's own
        // ambient-tenant self-service path AND from the Super Admin platform
        // console (explicit tenantId, no ambient tenant). Without
        // IgnoreQueryFilters(), a Super Admin's call would fall back to the
        // global query filter's IsSuperAdmin bypass - which returns EVERY
        // tenant's rows for this role, not just the target tenant's - so the
        // diff below would remove/add across tenant boundaries. This was a
        // real, previously-unnoticed cross-tenant data-corruption bug.
        var existing = await _dbContext.RolePermissions
            .IgnoreQueryFilters()
            .Where(rp => rp.TenantId == tenantId && rp.Role == role)
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

        // Bump the tenant's permission version so already-issued access
        // tokens for this tenant are detected as stale within one cache
        // cycle in every downstream service, instead of only at their next
        // natural expiry/refresh (up to ~15 minutes). IgnoreQueryFilters()
        // for the same Super-Admin-explicit-tenantId reason as above.
        var tenant = await _dbContext.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is not null)
        {
            tenant.PermissionVersion++;
        }
    }

    public async Task<IReadOnlyList<string>> GetForRoleAsync(
        Guid tenantId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var tenantHasAnyRows = await _dbContext.RolePermissions
            .IgnoreQueryFilters()
            .AnyAsync(rp => rp.TenantId == tenantId, cancellationToken);
        if (!tenantHasAnyRows)
        {
            return RolePermissionCatalog.DefaultsForRole(role);
        }

        return await _dbContext.RolePermissions
            .IgnoreQueryFilters()
            .Where(rp => rp.TenantId == tenantId && rp.Role == role)
            .Select(rp => rp.PermissionKey)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
