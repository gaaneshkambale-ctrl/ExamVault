using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.RolePermissions.GetAll;

public class GetAllRolePermissionsHandler
{
    private readonly IRolePermissionRepository _rolePermissionRepository;

    public GetAllRolePermissionsHandler(IRolePermissionRepository rolePermissionRepository)
    {
        _rolePermissionRepository = rolePermissionRepository;
    }

    public async Task<IReadOnlyList<RoleWithPermissions>> HandleAsync(
        GetAllRolePermissionsQuery query,
        CancellationToken cancellationToken = default)
    {
        var rows = await _rolePermissionRepository.GetAllAsync(cancellationToken);

        // First time this tenant has ever touched the feature - seed the
        // catalog's defaults once so this (and every future) read has real
        // rows to work from instead of re-deriving defaults on every call.
        if (rows.Count == 0)
        {
            var seed = RolePermissionCatalog.Roles
                .SelectMany(role => RolePermissionCatalog.DefaultsForRole(role)
                    .Select(key => new RolePermission { TenantId = query.TenantId, Role = role, PermissionKey = key }))
                .ToList();
            await _rolePermissionRepository.AddRangeAsync(seed, cancellationToken);
            await _rolePermissionRepository.SaveChangesAsync(cancellationToken);
            rows = seed;
        }

        return rows
            .GroupBy(rp => rp.Role)
            .Select(g => new RoleWithPermissions(g.Key, g.Select(rp => rp.PermissionKey).ToList()))
            .ToList();
    }
}
