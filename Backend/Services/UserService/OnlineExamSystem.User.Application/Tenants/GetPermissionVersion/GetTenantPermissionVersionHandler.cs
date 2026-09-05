using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.GetPermissionVersion;

// Backs the internal-only endpoint every other service's PermissionVersionGuard
// polls (with a short local cache) to detect an access token issued before a
// permission change - see Tenant.PermissionVersion / RolePermissionRepository.
public class GetTenantPermissionVersionHandler
{
    private readonly ITenantRepository _tenantRepository;

    public GetTenantPermissionVersionHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public async Task<int?> HandleAsync(
        GetTenantPermissionVersionQuery query,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(query.TenantId, cancellationToken);
        return tenant?.PermissionVersion;
    }
}
