using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.SetTrial;

public class SetTenantTrialHandler
{
    private readonly ITenantRepository _tenantRepository;

    public SetTenantTrialHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public async Task<SetTenantTrialResult> HandleAsync(
        SetTenantTrialCommand command,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return SetTenantTrialResult.NotFound();
        }

        if (command.IsTrial && (command.TrialEndsAtUtc is null || command.TrialEndsAtUtc <= DateTime.UtcNow))
        {
            return SetTenantTrialResult.Invalid("Trial end date must be set and in the future.");
        }

        tenant.IsTrial = command.IsTrial;
        tenant.TrialEndsAtUtc = command.IsTrial ? command.TrialEndsAtUtc : null;
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return SetTenantTrialResult.Ok(tenant);
    }
}
