using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IOrganizationTypeRepository
{
    Task<OrganizationType?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<OrganizationType?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OrganizationType>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(OrganizationType organizationType, CancellationToken cancellationToken = default);
    void Remove(OrganizationType organizationType);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
