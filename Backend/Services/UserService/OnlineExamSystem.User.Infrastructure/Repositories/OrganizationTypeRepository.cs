using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class OrganizationTypeRepository : IOrganizationTypeRepository
{
    private readonly UserDbContext _dbContext;

    public OrganizationTypeRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<OrganizationType?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.OrganizationTypes.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task<OrganizationType?> GetByNameAsync(string name, CancellationToken cancellationToken = default) =>
        _dbContext.OrganizationTypes.FirstOrDefaultAsync(t => t.Name == name, cancellationToken);

    public async Task<IReadOnlyList<OrganizationType>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.OrganizationTypes.OrderBy(t => t.SortOrder).ThenBy(t => t.Name).ToListAsync(cancellationToken);

    public Task AddAsync(OrganizationType organizationType, CancellationToken cancellationToken = default) =>
        _dbContext.OrganizationTypes.AddAsync(organizationType, cancellationToken).AsTask();

    public void Remove(OrganizationType organizationType) => _dbContext.OrganizationTypes.Remove(organizationType);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
