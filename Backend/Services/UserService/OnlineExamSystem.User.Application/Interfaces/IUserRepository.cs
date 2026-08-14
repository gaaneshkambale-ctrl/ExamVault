using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IUserRepository
{
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default);
    Task RemoveAsync(AppUser user, CancellationToken cancellationToken = default);
    Task AddAsync(AppUser user, CancellationToken cancellationToken = default);
    Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task RevokeAllRefreshTokensForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RefreshToken>> GetRefreshTokensByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
