using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class TenantRepository : ITenantRepository
{
    private readonly UserDbContext _dbContext;

    public TenantRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Tenant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public Task<Tenant?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default) =>
        _dbContext.Tenants.FirstOrDefaultAsync(t => t.Slug == slug, cancellationToken);

    public Task<Tenant?> GetByOrganizationCodeAsync(string organizationCode, CancellationToken cancellationToken = default) =>
        _dbContext.Tenants.FirstOrDefaultAsync(t => t.OrganizationCode == organizationCode, cancellationToken);

    public async Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Tenants.OrderByDescending(t => t.CreatedAtUtc).ToListAsync(cancellationToken);

    public Task AddAsync(Tenant tenant, CancellationToken cancellationToken = default) =>
        _dbContext.Tenants.AddAsync(tenant, cancellationToken).AsTask();

    public Task RemoveAsync(Tenant tenant, CancellationToken cancellationToken = default)
    {
        _dbContext.Tenants.Remove(tenant);
        return Task.CompletedTask;
    }

    public async Task DeleteUsersAndGroupsForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        await _dbContext.Groups.IgnoreQueryFilters().Where(g => g.TenantId == tenantId).ExecuteDeleteAsync(cancellationToken);
        await _dbContext.Users.IgnoreQueryFilters().Where(u => u.TenantId == tenantId).ExecuteDeleteAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
