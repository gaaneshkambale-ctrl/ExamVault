using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.TokenRefresh;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Authentication;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class RefreshTokenHandlerTests
{
    private static readonly JwtTokenService Jwt = JwtTestHelper.CreateService();

    private static RefreshTokenHandler CreateHandler(
        FakeUserRepository repository,
        FakePlatformSettingsRepository? platformSettingsRepository = null) =>
        new(
            repository,
            new FakeTenantRepository(),
            new FakePlanRepository(),
            new FakeRolePermissionRepository(),
            platformSettingsRepository ?? new FakePlatformSettingsRepository(),
            Jwt);

    private static async Task<(AppUser User, string RawToken)> SeedUserWithRefreshToken(
        FakeUserRepository repository,
        DateTime? expiresAtUtc = null,
        DateTime? revokedAtUtc = null,
        bool isActive = true,
        Guid? tenantId = null)
    {
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", IsActive = isActive };
        if (tenantId is not null)
        {
            user.TenantId = tenantId.Value;
        }
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

    [Fact]
    public async Task Disabling_self_registration_rejects_an_already_logged_in_self_registered_users_refresh()
    {
        // Real bug, hit live: a refresh only mints a new access token from
        // an existing valid refresh token - it never re-runs the full login
        // flow, so without this check an already-logged-in self-registered
        // user stayed silently logged in (via this endpoint) regardless of
        // the AllowSelfRegistration toggle, even though a brand-new login
        // attempt was correctly blocked.
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, tenantId: TenantConstants.DefaultTenantId);
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { AllowSelfRegistration = false },
        };
        var handler = CreateHandler(repository, platformSettings);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Disabling_self_registration_does_not_reject_a_regular_org_users_refresh()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, tenantId: Guid.NewGuid());
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { AllowSelfRegistration = false },
        };
        var handler = CreateHandler(repository, platformSettings);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.True(result.Success);
    }
}
