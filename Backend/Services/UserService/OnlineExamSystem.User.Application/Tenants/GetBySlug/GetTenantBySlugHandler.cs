using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.GetBySlug;

public class GetTenantBySlugHandler
{
    private readonly ITenantRepository _tenantRepository;

    public GetTenantBySlugHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public Task<Tenant?> HandleAsync(GetTenantBySlugQuery query, CancellationToken cancellationToken = default) =>
        _tenantRepository.GetBySlugAsync(query.Slug, cancellationToken);
}
