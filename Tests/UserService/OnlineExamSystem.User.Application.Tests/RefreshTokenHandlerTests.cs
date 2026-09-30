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
        FakePlatformSettingsRepository? platformSettingsRepository = null,
        FakeTenantRepository? tenantRepository = null) =>
        new(
            repository,
            tenantRepository ?? ActiveTenantsFor(repository),
            new FakePlanRepository(),
            new FakeRolePermissionRepository(),
            platformSettingsRepository ?? new FakePlatformSettingsRepository(),
            Jwt);

    // Refresh now requires the user's organization to exist and be active,
    // so by default every seeded user's tenant is an active one.
    private static FakeTenantRepository ActiveTenantsFor(FakeUserRepository repository)
    {
        var tenants = new FakeTenantRepository();
        foreach (var tenantId in repository.Users.Select(u => u.TenantId).Distinct())
        {
            tenants.AddAsync(new Tenant { Id = tenantId, Name = "Org", Slug = $"org-{tenantId:N}", IsActive = true })
                .GetAwaiter().GetResult();
        }
        return tenants;
    }

    private static async Task<(AppUser User, string RawToken)> SeedUserWithRefreshToken(
        FakeUserRepository repository,
        DateTime? expiresAtUtc = null,
        DateTime? revokedAtUtc = null,
        bool isActive = true,
        Guid? tenantId = null,
        DateTime? sessionStartedAtUtc = null)
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
            SessionStartedAtUtc = sessionStartedAtUtc ?? DateTime.UtcNow,
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
    private static FakeTenantRepository TenantWith(Guid tenantId, bool isActive)
    {
        var tenants = new FakeTenantRepository();
        tenants.AddAsync(new Tenant { Id = tenantId, Name = "Org", Slug = "org", IsActive = isActive }).GetAwaiter().GetResult();
        return tenants;
    }

    [Fact]
    public async Task Refresh_is_rejected_once_the_users_organization_is_deactivated()
    {
        var repository = new FakeUserRepository();
        var tenantId = Guid.NewGuid();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, tenantId: tenantId);
        var handler = CreateHandler(repository, tenantRepository: TenantWith(tenantId, isActive: false));

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task New_org_admin_still_completing_the_forced_password_change_can_refresh()
    {
        var repository = new FakeUserRepository();
        var tenantId = Guid.NewGuid();
        var (user, rawToken) = await SeedUserWithRefreshToken(repository, tenantId: tenantId);
        user.MustChangePassword = true;
        var handler = CreateHandler(repository, tenantRepository: TenantWith(tenantId, isActive: false));

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.True(result.Success);
    }

    [Fact]
    public async Task Session_older_than_the_absolute_lifetime_is_rejected()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(
            repository,
            sessionStartedAtUtc: DateTime.UtcNow - RefreshTokenHandler.MaxSessionAge - TimeSpan.FromMinutes(1));
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Rotated_refresh_token_keeps_the_original_session_start()
    {
        var repository = new FakeUserRepository();
        var sessionStart = DateTime.UtcNow.AddDays(-10);
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, sessionStartedAtUtc: sessionStart);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.True(result.Success);
        var rotated = repository.RefreshTokens.Single(t => t.TokenHash == Jwt.HashToken(result.RefreshToken!));
        Assert.Equal(sessionStart, rotated.SessionStartedAtUtc);
    }

    [Fact]
    public async Task Maintenance_mode_rejects_a_regular_users_refresh()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithRefreshToken(repository, tenantId: Guid.NewGuid());
        var platformSettings = new FakePlatformSettingsRepository
        {
            Settings = new PlatformSettings { MaintenanceModeEnabled = true },
        };
        var handler = CreateHandler(repository, platformSettings);

        var result = await handler.HandleAsync(new RefreshTokenCommand(rawToken));

        Assert.False(result.Success);
    }
}
