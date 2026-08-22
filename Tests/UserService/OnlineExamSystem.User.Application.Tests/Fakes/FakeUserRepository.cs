using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeUserRepository : IUserRepository
{
    private readonly List<AppUser> _users = [];
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<UserPreferences> _userPreferences = [];

    public IReadOnlyList<RefreshToken> RefreshTokens => _refreshTokens;

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_users.FirstOrDefault(u => u.Id == id));

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        Task.FromResult(_users.FirstOrDefault(u => u.Email == email));

    public Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<AppUser>>(_users.ToList());

    public Task<IReadOnlyList<AppUser>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<AppUser>>(_users.Where(u => ids.Contains(u.Id)).ToList());

    public Task RemoveAsync(AppUser user, CancellationToken cancellationToken = default)
    {
        _users.Remove(user);
        return Task.CompletedTask;
    }

    public Task AddAsync(AppUser user, CancellationToken cancellationToken = default)
    {
        _users.Add(user);
        return Task.CompletedTask;
    }

    public Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
    {
        _refreshTokens.Add(refreshToken);
        return Task.CompletedTask;
    }

    public Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        Task.FromResult(_refreshTokens.FirstOrDefault(t => t.TokenHash == tokenHash));

    public Task RevokeAllRefreshTokensForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        foreach (var token in _refreshTokens.Where(t => t.UserId == userId && t.RevokedAtUtc == null))
        {
            token.RevokedAtUtc = DateTime.UtcNow;
        }
        return Task.CompletedTask;
    }

    public Task RevokeOtherRefreshTokensForUserAsync(Guid userId, string currentTokenHash, CancellationToken cancellationToken = default)
    {
        foreach (var token in _refreshTokens.Where(t =>
                     t.UserId == userId && t.RevokedAtUtc == null && t.TokenHash != currentTokenHash))
        {
            token.RevokedAtUtc = DateTime.UtcNow;
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<RefreshToken>> GetRefreshTokensByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<RefreshToken>>(
            _refreshTokens.Where(t => t.UserId == userId).OrderByDescending(t => t.CreatedAtUtc).ToList());

    public Task<UserPreferences> GetOrCreateUserPreferencesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var preferences = _userPreferences.FirstOrDefault(p => p.UserId == userId);
        if (preferences is null)
        {
            preferences = new UserPreferences { UserId = userId };
            _userPreferences.Add(preferences);
        }
        return Task.FromResult(preferences);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
