using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IUserRepository
{
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUser>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken = default);
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
