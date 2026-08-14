using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.ListSessions;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class ListUserSessionsHandlerTests
{
    [Fact]
    public async Task Returns_sessions_for_the_user_ordered_newest_first()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };
        await repository.AddAsync(user);

        var older = new RefreshToken { UserId = user.Id, TokenHash = "older", ExpiresAtUtc = DateTime.UtcNow.AddDays(7), CreatedAtUtc = DateTime.UtcNow.AddDays(-2) };
        var newer = new RefreshToken { UserId = user.Id, TokenHash = "newer", ExpiresAtUtc = DateTime.UtcNow.AddDays(7), CreatedAtUtc = DateTime.UtcNow.AddDays(-1) };
        await repository.AddRefreshTokenAsync(older);
        await repository.AddRefreshTokenAsync(newer);

        var otherUser = new AppUser { FullName = "Other", Email = "other@example.com" };
        await repository.AddAsync(otherUser);
        await repository.AddRefreshTokenAsync(new RefreshToken { UserId = otherUser.Id, TokenHash = "other-token", ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });

        var handler = new ListUserSessionsHandler(repository);

        var result = await handler.HandleAsync(new ListUserSessionsQuery(user.Id));

        Assert.Equal(2, result.Count);
        Assert.Equal("newer", result[0].TokenHash);
        Assert.Equal("older", result[1].TokenHash);
    }

    [Fact]
    public async Task Unknown_user_id_returns_empty_list()
    {
        var repository = new FakeUserRepository();
        var handler = new ListUserSessionsHandler(repository);

        var result = await handler.HandleAsync(new ListUserSessionsQuery(Guid.NewGuid()));

        Assert.Empty(result);
    }
}
