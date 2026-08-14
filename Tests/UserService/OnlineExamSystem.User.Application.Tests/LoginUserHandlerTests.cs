using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class LoginUserHandlerTests
{
    private static LoginUserHandler CreateHandler(FakeUserRepository repository) =>
        new(repository, new LoginUserValidator(), new PasswordHasher<AppUser>(), JwtTestHelper.CreateService());

    private static async Task<AppUser> SeedUser(
        FakeUserRepository repository,
        string email,
        string password,
        bool isActive = true)
    {
        var user = new AppUser { FullName = "Jane Doe", Email = email, IsActive = isActive };
        user.PasswordHash = new PasswordHasher<AppUser>().HashPassword(user, password);
        await repository.AddAsync(user);
        return user;
    }

    [Fact]
    public async Task Correct_email_and_password_returns_the_user()
    {
        var repository = new FakeUserRepository();
        var user = await SeedUser(repository, "jane@example.com", "Passw0rd!");
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!"));

        Assert.True(result.Success);
        Assert.Equal(user.Id, result.User!.Id);
        Assert.False(string.IsNullOrEmpty(result.AccessToken));
        Assert.False(string.IsNullOrEmpty(result.RefreshToken));
    }

    [Fact]
    public async Task Unknown_email_returns_invalid_credentials()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("nobody@example.com", "Passw0rd!"));

        Assert.False(result.Success);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task Wrong_password_returns_invalid_credentials()
    {
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!");
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "WrongPassword1"));

        Assert.False(result.Success);
    }

    [Fact]
    public async Task Deactivated_user_with_correct_credentials_is_rejected_as_account_deactivated()
    {
        var repository = new FakeUserRepository();
        await SeedUser(repository, "jane@example.com", "Passw0rd!", isActive: false);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("jane@example.com", "Passw0rd!"));

        Assert.False(result.Success);
        Assert.True(result.IsAccountDeactivated);
        Assert.Null(result.AccessToken);
    }

    [Fact]
    public async Task Empty_credentials_return_invalid_credentials_without_hitting_the_repository()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new LoginUserCommand("", ""));

        Assert.False(result.Success);
    }
}
