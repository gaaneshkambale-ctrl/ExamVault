using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class PlanRepository : IPlanRepository
{
    private readonly UserDbContext _dbContext;

    public PlanRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<Plan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Plans.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public Task<Plan?> GetByNameAsync(string name, CancellationToken cancellationToken = default) =>
        _dbContext.Plans.FirstOrDefaultAsync(p => p.Name == name, cancellationToken);

    public async Task<IReadOnlyList<Plan>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Plans.OrderBy(p => p.Name).ToListAsync(cancellationToken);

    public Task AddAsync(Plan plan, CancellationToken cancellationToken = default) =>
        _dbContext.Plans.AddAsync(plan, cancellationToken).AsTask();

    public Task<bool> IsAssignedToAnyTenantAsync(Guid planId, CancellationToken cancellationToken = default) =>
        _dbContext.Tenants.AnyAsync(t => t.PlanId == planId, cancellationToken);

    public void Remove(Plan plan) => _dbContext.Plans.Remove(plan);

    public async Task<IReadOnlyList<PlanFeature>> GetFeaturesForTenantAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return [];
        }

        var plan = await _dbContext.Plans.FirstOrDefaultAsync(p => p.Id == tenant.PlanId, cancellationToken);
        return plan?.IncludedFeatures ?? [];
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
