using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakePlanRepository : IPlanRepository
{
    private readonly List<Plan> _plans = [];
    private readonly FakeTenantRepository? _tenantRepository;

    public FakePlanRepository(FakeTenantRepository? tenantRepository = null)
    {
        _tenantRepository = tenantRepository;
    }

    public Task<Plan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_plans.FirstOrDefault(p => p.Id == id));

    public Task<Plan?> GetByNameAsync(string name, CancellationToken cancellationToken = default) =>
        Task.FromResult(_plans.FirstOrDefault(p => p.Name == name));

    public Task<IReadOnlyList<Plan>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Plan>>(_plans.ToList());

    public Task AddAsync(Plan plan, CancellationToken cancellationToken = default)
    {
        _plans.Add(plan);
        return Task.CompletedTask;
    }

    public Task<bool> IsAssignedToAnyTenantAsync(Guid planId, CancellationToken cancellationToken = default) =>
        Task.FromResult(false);

    public void Remove(Plan plan) => _plans.Remove(plan);

    public async Task<IReadOnlyList<PlanFeature>> GetFeaturesForTenantAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantRepository is null)
        {
            return [];
        }

        var tenant = await _tenantRepository.GetByIdAsync(tenantId, cancellationToken);
        var plan = tenant is null ? null : _plans.FirstOrDefault(p => p.Id == tenant.PlanId);
        return plan?.IncludedFeatures ?? [];
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
