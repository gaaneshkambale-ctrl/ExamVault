using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IPlanRepository
{
    Task<Plan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Plan?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Plan>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Plan plan, CancellationToken cancellationToken = default);
    Task<bool> IsAssignedToAnyTenantAsync(Guid planId, CancellationToken cancellationToken = default);
    void Remove(Plan plan);

    /// <summary>The caller's included features, resolved via their Tenant's current
    /// Plan - embedded into the access token at login/refresh so every downstream
    /// service can authorize locally, no per-request lookup back to this service.
    /// Empty if the tenant or its plan can't be resolved (never blocks login).</summary>
    Task<IReadOnlyList<PlanFeature>> GetFeaturesForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
