using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.UpdateAdminPermissions;

// Super Admin's platform-console counterpart to a tenant's own self-service
// Roles & Permissions page (RolesController.UpdatePermissions) - writes to
// the same RolePermission row via IRolePermissionRepository, so it takes
// effect through the exact same JWT-claim-resolution path (next login/
// refresh) as a tenant Admin's own edit. Hardcoded to the "Admin" role -
// this endpoint is deliberately scoped to Super Admin configuring a
// tenant's Admin permissions, not general cross-role management.
public class UpdateTenantAdminPermissionsHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;

    public UpdateTenantAdminPermissionsHandler(
        ITenantRepository tenantRepository,
        IRolePermissionRepository rolePermissionRepository)
    {
        _tenantRepository = tenantRepository;
        _rolePermissionRepository = rolePermissionRepository;
    }

    public async Task<UpdateTenantAdminPermissionsResult> HandleAsync(
        UpdateTenantAdminPermissionsCommand command,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return UpdateTenantAdminPermissionsResult.NotFound();
        }

        var distinctPermissions = command.Permissions.Distinct().ToList();
        await _rolePermissionRepository.ReplaceForRoleAsync(command.TenantId, "Admin", distinctPermissions, cancellationToken);
        await _rolePermissionRepository.SaveChangesAsync(cancellationToken);

        return UpdateTenantAdminPermissionsResult.Ok(distinctPermissions);
    }
}
