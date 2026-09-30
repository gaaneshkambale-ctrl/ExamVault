using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Delete;
using OnlineExamSystem.User.Domain.Entities;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class DeleteUserHandlerTests
{
    [Fact]
    public async Task Existing_user_is_removed()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "To Be Deleted", Email = "delete-me@example.com" };
        await repository.AddAsync(user);
        var handler = new DeleteUserHandler(repository);

        var result = await handler.HandleAsync(new DeleteUserCommand(user.Id));

        Assert.True(result.Success);
    }

    // The deleted row is gone by the time the controller sees this result -
    // it has to carry the user's own FullName back so UsersController can
    // write a real "Deleted user" audit entry (matching Create/Update's
    // own calls). TenantId doesn't need the same treatment here - the
    // controller already has the caller's own tenant from the JWT claim.
    [Fact]
    public async Task Result_carries_the_deleted_user_s_full_name_for_auditing()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Audit Me", Email = "audit-me@example.com" };
        await repository.AddAsync(user);
        var handler = new DeleteUserHandler(repository);

        var result = await handler.HandleAsync(new DeleteUserCommand(user.Id));

        Assert.Equal("Audit Me", result.FullName);
    }

    [Fact]
    public async Task Unknown_user_returns_not_found()
    {
        var repository = new FakeUserRepository();
        var handler = new DeleteUserHandler(repository);

        var result = await handler.HandleAsync(new DeleteUserCommand(Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.IsNotFound);
    }
}
