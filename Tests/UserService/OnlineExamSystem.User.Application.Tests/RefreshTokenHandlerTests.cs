using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.TokenRefresh;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Authentication;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class RefreshTokenHandlerTests
{
    private static readonly JwtTokenService Jwt = JwtTestHelper.CreateService();

    private static RefreshTokenHandler CreateHandler(FakeUserRepository repository) =>
        new(
            repository,
            new FakeTenantRepository(),
            new FakePlanRepository(),
            new FakeRolePermissionRepository(),
            new FakePlatformSettingsRepository(),
            Jwt);

    private static async Task<(AppUser User, string RawToken)> SeedUserWithRefreshToken(
        FakeUserRepository repository,
        DateTime? expiresAtUtc = null,
        DateTime? revokedAtUtc = null,
        bool isActive = true)
    {
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", IsActive = isActive };
        await repository.AddAsync(user);

        var rawToken = Jwt.GenerateRefreshToken();
        await repository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = Jwt.HashToken(rawToken),
            ExpiresAtUtc = expiresAtUtc ?? Jwt.GetRefreshTokenExpiry(),
            RevokedAtUtc = revokedAtUtc,
        });

        return (user, rawToken);
    }

    [Fact]
    public async Task Valid_refresh_token_returns_new_tokens()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.True(result.Success);
        Assert.False(string.IsNullOrEmpty(result.AccessToken));
        Assert.False(string.IsNullOrEmpty(result.RefreshToken));
        Assert.NotEqual(rawToken, result.RefreshToken);
    }

    [Fact]
    public async Task Using_a_refresh_token_twice_fails_the_second_time()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository);
        var handler = CreateHandler(repository);
        await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        var secondResult = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(secondResult.Success);
    }

    [Fact]
    public async Task Expired_refresh_token_is_rejected()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, expiresAtUtc: DateTime.UtcNow.AddDays(-1));
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Revoked_refresh_token_is_rejected()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, revokedAtUtc: DateTime.UtcNow);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Refresh_token_for_deactivated_user_is_rejected()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, isActive: false);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Unknown_refresh_token_is_rejected()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand("not-a-real-token"));

        Assert.False(result.Success);
    }
}
