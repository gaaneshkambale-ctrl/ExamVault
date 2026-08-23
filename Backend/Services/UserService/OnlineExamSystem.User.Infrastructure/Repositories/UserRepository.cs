using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Persistence;

namespace OnlineExamSystem.User.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly UserDbContext _dbContext;
    private readonly ICurrentTenant _currentTenant;

    public UserRepository(UserDbContext dbContext, ICurrentTenant currentTenant)
    {
        _dbContext = dbContext;
        _currentTenant = currentTenant;
    }

    // Deliberately unscoped - used both by genuinely self-service callers
    // (ChangePassword/GetProfile/UpdateMyProfile/UpdateMyPhoto, where the
    // id is always the caller's own, taken from their own validated JWT)
    // and by RefreshTokenHandler, which runs with NO ambient tenant at
    // all (the refresh-token endpoint is anonymous - there's no access
    // token to read a tenant claim from). None of those can target
    // another tenant's user since the id isn't attacker-suppliable in
    // those flows. Admin-facing handlers that take an id from a route
    // parameter (Delete/Update/SetActiveStatus/ResetPassword) must use
    // GetByIdForTenantAsync instead - see that method's own comment.
    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    // The tenant-scoped counterpart to GetByIdAsync, for the Admin-facing
    // handlers that take a target user id from a route parameter
    // (Delete/Update/SetActiveStatus/ResetPassword) - these always have an
    // authenticated ambient tenant by the time they run, so unlike
    // GetByIdAsync above there's no anonymous-caller case to protect.
    // Was previously just GetByIdAsync with zero tenant check at all -
    // any Admin could target another tenant's user by id (view, edit,
    // deactivate, reset their password) purely by guessing/knowing a
    // Guid, same IsSuperAdmin-bypass shape every other tenant-scoped
    // entity in this codebase already uses.
    public Task<AppUser?> GetByIdForTenantAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Users.FirstOrDefaultAsync(
            u => u.Id == id && (_currentTenant.IsSuperAdmin || u.TenantId == _currentTenant.TenantId),
            cancellationToken);

    public Task<AppUser?> GetByEmailAsync(string email, Guid? tenantId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users.Where(u => u.Email == email);
        if (tenantId is not null)
        {
            query = query.Where(u => u.TenantId == tenantId);
        }

        return query.FirstOrDefaultAsync(cancellationToken);
    }

    // Was previously completely unscoped - any Admin's "Manage Users"
    // list returned every user across every tenant, not just their own.
    // IsSuperAdmin bypass lets the new Super Admin "All Users" view see
    // everyone, matching every other tenant-scoped list in this codebase.
    public async Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Users
            .Where(u => _currentTenant.IsSuperAdmin || u.TenantId == _currentTenant.TenantId)
            .OrderByDescending(u => u.CreatedAtUtc)
            .ToListAsync(cancellationToken);

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

    public async Task<bool> RevokeRefreshTokenByIdAsync(
        Guid userId,
        Guid tokenId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _dbContext.RefreshTokens
            .Where(t => t.Id == tokenId && t.UserId == userId && t.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAtUtc, DateTime.UtcNow), cancellationToken);
        return rows > 0;
    }

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
