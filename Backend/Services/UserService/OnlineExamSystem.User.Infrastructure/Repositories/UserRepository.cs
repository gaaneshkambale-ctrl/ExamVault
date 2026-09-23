using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
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

    // Explicit tenantId, not ICurrentTenant - CreateUserHandler's quota check
    // runs for the tenant the new user is being created in, which may differ
    // from the caller's own ambient tenant context (or have none at all).
    public Task<int> CountByTenantAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        _dbContext.Users.CountAsync(u => u.TenantId == tenantId, cancellationToken);

    public Task<int> CountByTenantAndRoleAsync(Guid tenantId, UserRole role, CancellationToken cancellationToken = default) =>
        _dbContext.Users.CountAsync(u => u.TenantId == tenantId && u.Role == role, cancellationToken);

    // SQL Server's "deadlock victim" error - the one real failure mode a
    // Serializable transaction can hit (the other outcome, a concurrent
    // transaction's count query blocking until this one commits, isn't an
    // exception at all - it's just a wait, the whole point of this
    // isolation level).
    private const int DeadlockVictimErrorNumber = 1205;

    public async Task<TResult> ExecuteInSerializableTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken = default)
    {
        // UserDbContext has EnableRetryOnFailure() on (Program.cs). EF Core
        // requires the WHOLE unit of work - begin, every operation run
        // against the transaction, commit - to run inside one
        // CreateExecutionStrategy().ExecuteAsync delegate once a retrying
        // strategy is active; wrapping only the BeginTransactionAsync call
        // (an earlier, incomplete version of this fix) satisfies that check
        // for the begin call but NOT the SaveChangesAsync call the caller's
        // operation makes afterward - confirmed live: Add User crashed with
        // "does not support user-initiated transactions" on every call
        // until operation() moved inside this same delegate. See this
        // method's own interface doc-comment (IUserRepository) for the full
        // story. Same fix applied to ExamRepository's identical method.
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _dbContext.Database.BeginTransactionAsync(
                IsolationLevel.Serializable, cancellationToken);
            try
            {
                var result = await operation(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return result;
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: DeadlockVictimErrorNumber })
            {
                throw new TransientConcurrencyException(
                    "This request lost a race with a concurrent one over the same limit check. Please try again.", ex);
            }
            catch (SqlException ex) when (ex.Number == DeadlockVictimErrorNumber)
            {
                throw new TransientConcurrencyException(
                    "This request lost a race with a concurrent one over the same limit check. Please try again.", ex);
            }
        });
    }

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

    public Task AddPasswordResetTokenAsync(PasswordResetToken token, CancellationToken cancellationToken = default) =>
        _dbContext.PasswordResetTokens.AddAsync(token, cancellationToken).AsTask();

    public Task<PasswordResetToken?> GetPasswordResetTokenByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default) =>
        _dbContext.PasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

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

    // SQL Server's two "duplicate key" error numbers - 2601 for a unique
    // INDEX (what every .HasIndex(...).IsUnique() in UserDbContext creates,
    // e.g. the (TenantId, Email) index), 2627 for a unique CONSTRAINT
    // (covered too in case that ever changes). The real trigger this exists
    // for: RegisterUserHandler/CreateUserHandler/UpdateUserHandler/
    // CreateTenantAdminHandler all check "does this email already exist"
    // before writing, but that check isn't inside a transaction - two
    // concurrent requests for the same email can both pass it, and the
    // loser hits this constraint instead of the handler's own friendly
    // Conflict() check (this is exactly what surfaced as an unhandled 500
    // on POST /api/users/register in production).
    private const int UniqueIndexViolationErrorNumber = 2601;
    private const int UniqueConstraintViolationErrorNumber = 2627;

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException
            { Number: UniqueIndexViolationErrorNumber or UniqueConstraintViolationErrorNumber })
        {
            throw new DuplicateKeyException(
                "This request lost a race with a concurrent one over the same uniqueness check. Please try again.", ex);
        }
    }
}
