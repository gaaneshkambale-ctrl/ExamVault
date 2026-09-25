using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.SetActiveStatus;

public class SetTenantActiveStatusHandler
{
    private readonly ITenantRepository _tenantRepository;

    public SetTenantActiveStatusHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public async Task<SetTenantActiveStatusResult> HandleAsync(
        SetTenantActiveStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        // Same protection DeleteTenantHandler already has for the platform
        // tenant, just missing here until now - deactivating it would stop
        // its own subdomain resolving and lock out every Super Admin,
        // including whoever just clicked the button (see ActionPlan.txt).
        // Reactivating it back to true is harmless, so only the false
        // direction is blocked.
        if (command.TenantId == TenantConstants.PlatformTenantId && !command.IsActive)
        {
            return SetTenantActiveStatusResult.Protected();
        }

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return SetTenantActiveStatusResult.NotFound();
        }

        tenant.IsActive = command.IsActive;
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return SetTenantActiveStatusResult.Ok(tenant);
    }
}
