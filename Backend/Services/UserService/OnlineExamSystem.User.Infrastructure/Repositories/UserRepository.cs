using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly UserDbContext _dbContext;

    public UserRepository(UserDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public async Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Users.OrderByDescending(u => u.CreatedAtUtc).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AppUser>> GetByIdsAsync(
        IReadOnlyList<Guid> ids,
        CancellationToken cancellationToken = default) =>
        await _dbContext.Users.Where(u => ids.Contains(u.Id)).ToListAsync(cancellationToken);

    public Task AddAsync(AppUser user, CancellationToken cancellationToken = default) =>
        _dbContext.Users.AddAsync(user, cancellationToken).AsTask();

    public Task RemoveAsync(AppUser user, CancellationToken cancellationToken = default)
    {
        _dbContext.Users.Remove(user);
        return Task.CompletedTask;
    }

    public Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default) =>
        _dbContext.RefreshTokens.AddAsync(refreshToken, cancellationToken).AsTask();

    public Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken = default) =>
        _dbContext.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public async Task RevokeAllRefreshTokensForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _dbContext.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, DateTime.UtcNow), cancellationToken);

    public async Task RevokeOtherRefreshTokensForUserAsync(
        Guid userId,
        string currentTokenHash,
        CancellationToken cancellationToken = default) =>
        await _dbContext.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAtUtc == null && t.TokenHash != currentTokenHash)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, DateTime.UtcNow), cancellationToken);

    public async Task<IReadOnlyList<RefreshToken>> GetRefreshTokensByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        await _dbContext.RefreshTokens
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<UserPreferences> GetOrCreateUserPreferencesAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var preferences = await _dbContext.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
        if (preferences is null)
        {
            preferences = new UserPreferences { UserId = userId };
            await _dbContext.UserPreferences.AddAsync(preferences, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return preferences;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
