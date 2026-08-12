using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeUserRepository : IUserRepository
{
    private readonly List<AppUser> _users = [];
    private readonly List<RefreshToken> _refreshTokens = [];

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_users.FirstOrDefault(u => u.Id == id));

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        Task.FromResult(_users.FirstOrDefault(u => u.Email == email));

    public Task<IReadOnlyList<AppUser>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<AppUser>>(_users.ToList());

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

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
