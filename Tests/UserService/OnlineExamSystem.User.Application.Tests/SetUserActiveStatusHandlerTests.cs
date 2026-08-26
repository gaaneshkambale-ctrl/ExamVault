using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.SetActiveStatus;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class SetUserActiveStatusHandlerTests
{
    private static SetUserActiveStatusHandler CreateHandler(FakeUserRepository repository) => new(repository);

    [Fact]
    public async Task Deactivating_a_user_sets_IsActive_false_and_revokes_active_refresh_tokens()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", IsActive = true };
        await repository.AddAsync(user);
        var token = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = "hash",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
        };
        await repository.AddRefreshTokenAsync(token);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new SetUserActiveStatusCommand(user.Id, false));

        Assert.True(result.Success);
        Assert.False(result.User!.IsActive);
        Assert.NotNull(repository.RefreshTokens.Single().RevokedAtUtc);
    }

    [Fact]
    public async Task Reactivating_a_user_sets_IsActive_true_and_does_not_touch_refresh_tokens()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", IsActive = false };
        await repository.AddAsync(user);
        var token = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = "hash",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7),
        };
        await repository.AddRefreshTokenAsync(token);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new SetUserActiveStatusCommand(user.Id, true));

        Assert.True(result.Success);
        Assert.True(result.User!.IsActive);
        Assert.Null(repository.RefreshTokens.Single().RevokedAtUtc);
    }

    [Fact]
    public async Task Unknown_user_returns_not_found()
    {
        var repository = new FakeUserRepository();
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(new SetUserActiveStatusCommand(Guid.NewGuid(), false));

        Assert.True(result.IsNotFound);
    }
}
