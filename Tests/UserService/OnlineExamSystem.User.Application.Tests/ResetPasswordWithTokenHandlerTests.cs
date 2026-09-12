using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ResetPasswordWithToken;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Authentication;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ResetPasswordWithTokenHandlerTests
{
    private static readonly JwtTokenService JwtService = JwtTestHelper.CreateService();

    private static ResetPasswordWithTokenHandler CreateHandler(FakeUserRepository repository) =>
        new(
            repository,
            new ResetPasswordWithTokenValidator(new FakePasswordPolicyProvider()),
            new PasswordHasher<AppUser>(),
            JwtService);

    private static async Task<(AppUser User, string RawToken)> SeedUserWithToken(
        FakeUserRepository repository,
        DateTime? expiresAtUtc = null,
        DateTime? usedAtUtc = null)
    {
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };
        user.PasswordHash = new PasswordHasher<AppUser>().HashPassword(user, "OldPassw0rd!");
        await repository.AddAsync(user);

        var rawToken = "raw-test-token-" + Guid.NewGuid();
        await repository.AddPasswordResetTokenAsync(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = JwtService.HashToken(rawToken),
            ExpiresAtUtc = expiresAtUtc ?? DateTime.UtcNow.AddMinutes(30),
            UsedAtUtc = usedAtUtc,
        });
        return (user, rawToken);
    }

    [Fact]
    public async Task Valid_token_sets_the_new_password_and_marks_the_token_used()
    {
        var repository = new FakeUserRepository();
        var (user, rawToken) = await SeedUserWithToken(repository);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ResetPasswordWithTokenCommand(rawToken, "NewPassw0rd!"));

        Assert.True(result.Success);
        var stored = await repository.GetByIdAsync(user.Id);
        var verification = new PasswordHasher<AppUser>().VerifyHashedPassword(stored!, stored!.PasswordHash, "NewPassw0rd!");
        Assert.Equal(PasswordVerificationResult.Success, verification);
        Assert.NotNull(repository.PasswordResetTokens[0].UsedAtUtc);
    }

    [Fact]
    public async Task Valid_token_revokes_every_existing_session_for_the_user()
    {
        var repository = new FakeUserRepository();
        var (user, rawToken) = await SeedUserWithToken(repository);
        await repository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = "some-session-hash",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
        });
        var handler = CreateHandler(repository);

        await handler.HandleAsync(new ResetPasswordWithTokenCommand(rawToken, "NewPassw0rd!"));

        Assert.All(repository.RefreshTokens, t => Assert.NotNull(t.RevokedAtUtc));
    }

    [Fact]
    public async Task Unknown_token_is_rejected_as_invalid_or_expired()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ResetPasswordWithTokenCommand("does-not-exist", "NewPassw0rd!"));

        Assert.False(result.Success);
        Assert.True(result.IsInvalidOrExpiredToken);
    }

    [Fact]
    public async Task Expired_token_is_rejected_as_invalid_or_expired()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithToken(repository, expiresAtUtc: DateTime.UtcNow.AddMinutes(-1));
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ResetPasswordWithTokenCommand(rawToken, "NewPassw0rd!"));

        Assert.True(result.IsInvalidOrExpiredToken);
    }

    [Fact]
    public async Task Already_used_token_is_rejected_as_invalid_or_expired()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithToken(repository, usedAtUtc: DateTime.UtcNow.AddMinutes(-5));
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ResetPasswordWithTokenCommand(rawToken, "NewPassw0rd!"));

        Assert.True(result.IsInvalidOrExpiredToken);
    }

    [Fact]
    public async Task Weak_password_is_rejected_by_the_password_policy()
    {
        var repository = new FakeUserRepository();
        var (_, rawToken) = await SeedUserWithToken(repository);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ResetPasswordWithTokenCommand(rawToken, "short"));

        Assert.False(result.Success);
        Assert.False(result.IsInvalidOrExpiredToken);
        Assert.NotEmpty(result.ValidationErrors);
    }
}
