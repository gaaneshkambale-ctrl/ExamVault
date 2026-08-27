using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Tenant?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Tenant tenant, CancellationToken cancellationToken = default);
    Task RemoveAsync(Tenant tenant, CancellationToken cancellationToken = default);

    /// <summary>Bulk-deletes every Group and User belonging to the given tenant.
    /// AppUser->Tenant and Group->Tenant are both DeleteBehavior.Restrict, so this
    /// must run (and its changes be saved) before the Tenant row itself can be
    /// removed. RefreshTokens/UserPreferences/GroupMembers cascade automatically
    /// once their owning User/Group is deleted - no need to touch those directly.</summary>
    Task DeleteUsersAndGroupsForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
