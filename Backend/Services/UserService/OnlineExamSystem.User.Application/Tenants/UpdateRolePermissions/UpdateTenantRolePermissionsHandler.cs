using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.RolePermissions;

namespace OnlineExamSystem.User.Application.Tenants.UpdateRolePermissions;

// Super Admin's platform-console counterpart to a tenant's own self-service
// Roles & Permissions page (RolesController.UpdatePermissions) - writes to
// the same RolePermission row via IRolePermissionRepository, so it takes
// effect through the exact same JWT-claim-resolution path (next login/
// refresh) as a tenant Admin's own edit. Role-parameterized (Phase 5)
// across all 3 real tenant roles - Admin, Instructor, Student - not just
// Admin as Phase 4b originally shipped.
public class UpdateTenantRolePermissionsHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;

    public UpdateTenantRolePermissionsHandler(
        ITenantRepository tenantRepository,
        IRolePermissionRepository rolePermissionRepository)
    {
        _tenantRepository = tenantRepository;
        _rolePermissionRepository = rolePermissionRepository;
    }

    public async Task<UpdateTenantRolePermissionsResult> HandleAsync(
        UpdateTenantRolePermissionsCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!RolePermissionCatalog.TenantAssignableRoles.Contains(command.Role))
        {
            return UpdateTenantRolePermissionsResult.InvalidRole();
        }

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return UpdateTenantRolePermissionsResult.NotFound();
        }

        var distinctPermissions = command.Permissions.Distinct().ToList();
        await _rolePermissionRepository.ReplaceForRoleAsync(command.TenantId, command.Role, distinctPermissions, cancellationToken);
        await _rolePermissionRepository.SaveChangesAsync(cancellationToken);

        return UpdateTenantRolePermissionsResult.Ok(distinctPermissions);
    }
}
