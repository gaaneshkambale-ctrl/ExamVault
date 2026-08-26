using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Logout;
using OnlineExamSystem.User.Application.Users.TokenRefresh;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Infrastructure.Authentication;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class LogoutHandlerTests
{
    private static readonly JwtTokenService Jwt = JwtTestHelper.CreateService();

    [Fact]
    public async Task Logout_revokes_the_refresh_token_so_it_can_no_longer_be_used()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };
        await repository.AddAsync(user);
        var rawToken = Jwt.GenerateRefreshToken();
        await repository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = Jwt.HashToken(rawToken),
            ExpiresAtUtc = Jwt.GetRefreshTokenExpiry(),
        });
        var logoutHandler = new LogoutHandler(repository, Jwt);

        await logoutHandler.HandleAsync(new LogoutCommand(rawToken));

        var refreshHandler = new RefreshTokenHandler(repository, new FakePlanRepository(), Jwt);
        var result = await refreshHandler.HandleAsync(new RefreshTokenCommand(rawToken));
        Assert.False(result.Success);
    }

    [Fact]
    public async Task Logging_out_an_unknown_token_does_not_throw()
    {
        var repository = new FakeUserRepository();
        var handler = new LogoutHandler(repository, Jwt);

        await handler.HandleAsync(new LogoutCommand("not-a-real-token"));
    }
}
