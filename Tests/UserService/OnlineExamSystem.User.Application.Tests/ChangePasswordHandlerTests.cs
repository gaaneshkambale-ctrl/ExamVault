using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ChangePassword;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ChangePasswordHandlerTests
{
    private static ChangePasswordHandler CreateHandler(FakeUserRepository repository) =>
        new(
            repository,
            new FakeTenantRepository(),
            new ChangePasswordValidator(new FakePasswordPolicyProvider()),
            new PasswordHasher<AppUser>(),
            JwtTestHelper.CreateService());

    private static async Task<AppUser> SeedUser(
        FakeUserRepository repository,
        string currentPassword,
        bool isActive,
        bool mustChangePassword)
    {
        var user = new AppUser
        {
            FullName = "Jane Doe",
            Email = "jane@example.com",
            IsActive = isActive,
            MustChangePassword = mustChangePassword,
        };
        user.PasswordHash = new PasswordHasher<AppUser>().HashPassword(user, currentPassword);
        await repository.AddAsync(user);
        return user;
    }

    [Fact]
    public async Task Completing_the_forced_first_password_change_activates_the_account()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "TempPass1", isActive: false, mustChangePassword: true);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ChangePasswordCommand(user.Id, "TempPass1", "NewPassw0rd"));

        Assert.True(result.Success);
        var stored = await repository.GetByIdAsync(user.Id);
        Assert.True(stored!.IsActive);
        Assert.False(stored.MustChangePassword);
    }

    [Fact]
    public async Task Voluntary_password_change_by_an_already_active_user_leaves_it_active()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "OldPass1", isActive: true, mustChangePassword: false);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ChangePasswordCommand(user.Id, "OldPass1", "NewPassw0rd"));

        Assert.True(result.Success);
        var stored = await repository.GetByIdAsync(user.Id);
        Assert.True(stored!.IsActive);
    }

    [Fact]
    public async Task Wrong_current_password_is_rejected_and_does_not_activate_the_account()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "TempPass1", isActive: false, mustChangePassword: true);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ChangePasswordCommand(user.Id, "WrongPass1", "NewPassw0rd"));

        Assert.False(result.Success);
        Assert.True(result.IsCurrentPasswordWrong);
        var stored = await repository.GetByIdAsync(user.Id);
        Assert.False(stored!.IsActive);
    }

    [Fact]
    public async Task Unknown_user_returns_not_found()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ChangePasswordCommand(Guid.NewGuid(), "TempPass1", "NewPassw0rd"));

        Assert.True(result.IsNotFound);
    }
    [Fact]
    public async Task Changing_password_signs_out_every_other_session_but_keeps_the_callers()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "OldPassw0rd", isActive: true, mustChangePassword: false);
        var jwt = JwtTestHelper.CreateService();
        var currentRaw = jwt.GenerateRefreshToken();
        await repository.AddRefreshTokenAsync(new RefreshToken { UserId = user.Id, TokenHash = jwt.HashToken(currentRaw), ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });
        await repository.AddRefreshTokenAsync(new RefreshToken { UserId = user.Id, TokenHash = "other-device", ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ChangePasswordCommand(user.Id, "OldPassw0rd", "NewPassw0rd!", currentRaw));

        Assert.True(result.Success);
        Assert.True(repository.RefreshTokens.Single(t => t.TokenHash == jwt.HashToken(currentRaw)).IsActive);
        Assert.False(repository.RefreshTokens.Single(t => t.TokenHash == "other-device").IsActive);
    }

    [Fact]
    public async Task Changing_password_without_identifying_the_session_signs_out_everywhere()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "OldPassw0rd", isActive: true, mustChangePassword: false);
        await repository.AddRefreshTokenAsync(new RefreshToken { UserId = user.Id, TokenHash = "x", ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new ChangePasswordCommand(user.Id, "OldPassw0rd", "NewPassw0rd!"));

        Assert.True(result.Success);
        Assert.All(repository.RefreshTokens, t => Assert.False(t.IsActive));
    }
}
