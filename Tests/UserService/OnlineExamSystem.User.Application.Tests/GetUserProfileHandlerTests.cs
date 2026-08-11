using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class GetUserProfileHandlerTests
{
    [Fact]
    public async Task Existing_user_id_returns_the_user()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com" };
        await repository.AddAsync(user);
        var handler = new GetUserProfileHandler(repository);

        var result = await handler.HandleAsync(new GetUserProfileQuery(user.Id));

        Assert.NotNull(result);
        Assert.Equal("jane@example.com", result!.Email);
    }

    [Fact]
    public async Task Unknown_user_id_returns_null()
    {
        var repository = new FakeUserRepository();
        var handler = new GetUserProfileHandler(repository);

        var result = await handler.HandleAsync(new GetUserProfileQuery(Guid.NewGuid()));

        Assert.Null(result);
    }
}
