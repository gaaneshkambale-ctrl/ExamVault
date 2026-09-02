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
        _dbContext.RolePermissions.RemoveRange(existing);

        await _dbContext.RolePermissions.AddRangeAsync(
            permissionKeys.Select(key => new RolePermission { TenantId = tenantId, Role = role, PermissionKey = key }),
            cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
