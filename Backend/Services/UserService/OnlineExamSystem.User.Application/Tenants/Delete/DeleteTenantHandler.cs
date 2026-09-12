using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.Delete;

// Hard delete, matching this codebase's existing convention (DeleteUserHandler
// has no soft-delete either). Only touches UserDb - Tenant only exists here, so
// Exam/Question/Submission/Notification rows tagged with this TenantId become
// permanently unreachable rather than being purged (see ActionPlan.txt's own
// scope call-out for this feature).
public class DeleteTenantHandler
{
    private readonly ITenantRepository _tenantRepository;

    public DeleteTenantHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public async Task<DeleteTenantResult> HandleAsync(
        DeleteTenantCommand command,
        CancellationToken cancellationToken = default)
    {
        if (command.TenantId == TenantConstants.PlatformTenantId)
        {
            return DeleteTenantResult.Protected();
        }

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return DeleteTenantResult.NotFound();
        }

        // AppUser->Tenant and Group->Tenant are DeleteBehavior.Restrict - their
        // rows must be gone before the Tenant row can be removed.
        await _tenantRepository.DeleteUsersAndGroupsForTenantAsync(command.TenantId, cancellationToken);
        await _tenantRepository.RemoveAsync(tenant, cancellationToken);
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return DeleteTenantResult.Ok();
    }
}
