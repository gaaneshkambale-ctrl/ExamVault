using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.GetAdminPermissions;

// Super Admin's platform-console counterpart to a tenant's own self-service
// Roles & Permissions page (RolesController) - same underlying
// IRolePermissionRepository (built for JWT-claim resolution in Phase 1),
// just reached with an explicit TenantId instead of the ambient tenant
// claim, since Super Admin isn't scoped to any one tenant.
public class GetTenantAdminPermissionsHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;

    public GetTenantAdminPermissionsHandler(
        ITenantRepository tenantRepository,
        IRolePermissionRepository rolePermissionRepository)
    {
        _tenantRepository = tenantRepository;
        _rolePermissionRepository = rolePermissionRepository;
    }

    public async Task<GetTenantAdminPermissionsResult> HandleAsync(
        GetTenantAdminPermissionsQuery query,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(query.TenantId, cancellationToken);
        if (tenant is null)
        {
            return GetTenantAdminPermissionsResult.NotFound();
        }

        var permissions = await _rolePermissionRepository.GetForRoleAsync(query.TenantId, "Admin", cancellationToken);
        return GetTenantAdminPermissionsResult.Ok(permissions);
    }
}
