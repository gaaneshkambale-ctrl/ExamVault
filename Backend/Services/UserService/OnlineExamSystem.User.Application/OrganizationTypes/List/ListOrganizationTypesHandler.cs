using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.OrganizationTypes.List;

public class ListOrganizationTypesHandler
{
    private readonly IOrganizationTypeRepository _organizationTypeRepository;

    public ListOrganizationTypesHandler(IOrganizationTypeRepository organizationTypeRepository)
    {
        _organizationTypeRepository = organizationTypeRepository;
    }

    public async Task<IReadOnlyList<OrganizationType>> HandleAsync(
        ListOrganizationTypesQuery query,
        CancellationToken cancellationToken = default)
    {
        var all = await _organizationTypeRepository.GetAllAsync(cancellationToken);
        return query.ActiveOnly ? all.Where(t => t.IsActive).ToList() : all;
    }
}
