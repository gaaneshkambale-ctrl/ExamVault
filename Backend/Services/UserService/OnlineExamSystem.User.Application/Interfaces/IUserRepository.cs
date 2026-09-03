using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IUserRepository
{
    /// <summary>Unscoped by tenant - safe only for self-service callers (the id is
    /// always the caller's own, from their own validated JWT) and RefreshTokenHandler
    /// (runs with no ambient tenant at all, on the anonymous refresh-token endpoint).
    /// Admin-facing handlers that take a target user id from a route parameter must
    /// use <see cref="GetByIdForTenantAsync"/> instead.</summary>
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Tenant-scoped counterpart to <see cref="GetByIdAsync"/> (Super Admin
    /// bypasses the scope) - use this for any Admin-facing handler whose target user
    /// id comes from a route parameter rather than the caller's own JWT.</summary>
    Task<AppUser?> GetByIdForTenantAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Looks up a user by email. Pass <paramref name="tenantId"/> to scope the
    /// lookup to one tenant (uniqueness is enforced per-tenant, not globally) - pass
    /// null only where the caller doesn't yet know the tenant (e.g. Login, before
    /// Phase 3 subdomain resolution exists), which can match across tenants.</summary>
    Task<AppUser?> GetByEmailAsync(string email, Guid? tenantId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUser>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken = default);

    /// <summary>Real Tenant Settings > Default Limits "Max Users" enforcement point -
    /// CreateUserHandler checks this against Tenant.MaxUsers before creating a new
    /// user for that tenant.</summary>
    Task<int> CountByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task RemoveAsync(AppUser user, CancellationToken cancellationToken = default);
    Task AddAsync(AppUser user, CancellationToken cancellationToken = default);
    Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task RevokeAllRefreshTokensForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task RevokeOtherRefreshTokensForUserAsync(Guid userId, string currentTokenHash, CancellationToken cancellationToken = default);

    /// <summary>Revokes exactly one of the given user's own sessions. No-ops if the
    /// token id doesn't belong to that user (ownership check, not a lookup by id
    /// alone) or is already revoked. Returns true if a row was actually revoked.</summary>
    Task<bool> RevokeRefreshTokenByIdAsync(Guid userId, Guid tokenId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RefreshToken>> GetRefreshTokensByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Returns the given user's single UserPreferences row, creating it
    /// with the entity's own defaults if it doesn't exist yet.</summary>
    Task<UserPreferences> GetOrCreateUserPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
