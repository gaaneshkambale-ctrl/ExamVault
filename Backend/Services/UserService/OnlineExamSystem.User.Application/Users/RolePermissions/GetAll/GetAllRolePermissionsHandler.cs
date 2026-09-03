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

        // ToLookup + iterate the full catalog role list, not GroupBy over
        // rows - GroupBy only produces a group for roles that still have at
        // least one row, so a role an admin has revoked down to zero
        // permissions would be silently omitted from the response entirely.
        // The frontend would then find no entry for that role and fall back
        // to the hardcoded defaults, making a real "zero permissions" save
        // look like it never persisted. ToLookup returns an empty sequence
        // for a missing key instead of throwing or omitting it.
        var byRole = rows.ToLookup(rp => rp.Role);
        return RolePermissionCatalog.Roles
            .Select(role =>
            {
                var roleRows = byRole[role].ToList();
                var updatedAtUtc = roleRows.Count > 0 ? roleRows.Max(rp => rp.UpdatedAtUtc) : (DateTime?)null;
                return new RoleWithPermissions(role, roleRows.Select(rp => rp.PermissionKey).ToList(), updatedAtUtc);
            })
            .ToList();
    }
}
