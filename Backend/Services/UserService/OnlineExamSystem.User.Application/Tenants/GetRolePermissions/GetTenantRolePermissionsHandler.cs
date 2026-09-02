using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.RolePermissions;

namespace OnlineExamSystem.User.Application.Tenants.GetRolePermissions;

// Super Admin's platform-console counterpart to a tenant's own self-service
// Roles & Permissions page (RolesController) - same underlying
// IRolePermissionRepository (built for JWT-claim resolution in Phase 1),
// just reached with an explicit TenantId instead of the ambient tenant
// claim, since Super Admin isn't scoped to any one tenant. Role-
// parameterized (Phase 5) across all 3 real tenant roles - Admin,
// Instructor, Student - not just Admin as Phase 4b originally shipped.
public class GetTenantRolePermissionsHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;

    public GetTenantRolePermissionsHandler(
        ITenantRepository tenantRepository,
        IRolePermissionRepository rolePermissionRepository)
    {
        _tenantRepository = tenantRepository;
        _rolePermissionRepository = rolePermissionRepository;
    }

    public async Task<GetTenantRolePermissionsResult> HandleAsync(
        GetTenantRolePermissionsQuery query,
        CancellationToken cancellationToken = default)
    {
        if (!RolePermissionCatalog.TenantAssignableRoles.Contains(query.Role))
        {
            return GetTenantRolePermissionsResult.InvalidRole();
        }

        var tenant = await _tenantRepository.GetByIdAsync(query.TenantId, cancellationToken);
        if (tenant is null)
        {
            return GetTenantRolePermissionsResult.NotFound();
        }

        var permissions = await _rolePermissionRepository.GetForRoleAsync(query.TenantId, query.Role, cancellationToken);
        return GetTenantRolePermissionsResult.Ok(permissions);
    }
}
