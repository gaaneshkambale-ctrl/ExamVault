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

    public async Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Tenants.OrderByDescending(t => t.CreatedAtUtc).ToListAsync(cancellationToken);

    public Task AddAsync(Tenant tenant, CancellationToken cancellationToken = default) =>
        _dbContext.Tenants.AddAsync(tenant, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
