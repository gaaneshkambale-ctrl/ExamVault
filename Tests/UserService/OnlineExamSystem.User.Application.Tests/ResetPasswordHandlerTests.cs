using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ResetPassword;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ResetPasswordHandlerTests
{
    [Fact]
    public async Task Admin_password_reset_signs_the_user_out_of_every_session()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };
        await repository.AddAsync(user);
        await repository.AddRefreshTokenAsync(new RefreshToken { UserId = user.Id, TokenHash = "a", ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });
        await repository.AddRefreshTokenAsync(new RefreshToken { UserId = user.Id, TokenHash = "b", ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });
        var handler = new ResetPasswordHandler(
            repository,
            new ResetPasswordValidator(new FakePasswordPolicyProvider()),
            new PasswordHasher<AppUser>());

        var result = await handler.HandleAsync(new ResetPasswordCommand(user.Id, "NewPassw0rd!"));

        Assert.True(result.Success);
        Assert.All(repository.RefreshTokens, t => Assert.False(t.IsActive));
    }
}
