using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.GetOrganizationSettings;

public class GetOrganizationSettingsHandler
{
    private readonly ITenantRepository _tenantRepository;

    public GetOrganizationSettingsHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public Task<Tenant?> HandleAsync(GetOrganizationSettingsQuery query, CancellationToken cancellationToken = default) =>
        _tenantRepository.GetByIdAsync(query.TenantId, cancellationToken);
}
