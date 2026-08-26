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
