using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.List;

public class ListTenantsHandler
{
    private readonly ITenantRepository _tenantRepository;

    public ListTenantsHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public Task<IReadOnlyList<Tenant>> HandleAsync(
        ListTenantsQuery query,
        CancellationToken cancellationToken = default) =>
        _tenantRepository.GetAllAsync(cancellationToken);
}
