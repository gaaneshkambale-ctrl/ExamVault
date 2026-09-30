using OnlineExamSystem.User.Application.Tests.Fakes;
using OnlineExamSystem.User.Application.Users.Update;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

public class UpdateUserHandlerTests
{
    private static UpdateUserHandler CreateHandler(FakeUserRepository repository) =>
        new(repository, new UpdateUserValidator());

    private static UpdateUserCommand CommandFor(AppUser user, string role, Guid? callerUserId = null) => new(
        user.Id, user.FullName, user.Email, role,
        PhoneNumber: "+91 98765 43210",
        CallerUserId: callerUserId);

    [Fact]
    public async Task Blocks_promoting_another_user_to_admin()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", Role = UserRole.Student };
        await repository.AddAsync(user);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(CommandFor(user, "Admin", callerUserId: Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.CannotAssignAdminRole);
        Assert.Equal(UserRole.Student, user.Role);
    }

    [Fact]
    public async Task Allows_editing_an_existing_admins_other_fields_without_changing_role()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", Role = UserRole.Admin };
        await repository.AddAsync(user);
        var handler = CreateHandler(repository);

        var command = CommandFor(user, "Admin", callerUserId: Guid.NewGuid()) with { FullName = "Jane A. Doe" };
        var result = await handler.HandleAsync(command);

        Assert.True(result.Success);
        Assert.False(result.CannotAssignAdminRole);
        Assert.Equal("Jane A. Doe", result.User!.FullName);
    }

    [Fact]
    public async Task Blocks_a_caller_from_changing_their_own_role()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", Role = UserRole.Student };
        await repository.AddAsync(user);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(CommandFor(user, "Instructor", callerUserId: user.Id));

        Assert.False(result.Success);
        Assert.True(result.CannotChangeSelfRole);
        Assert.Equal(UserRole.Student, user.Role);
    }

    [Fact]
    public async Task Allows_changing_role_among_non_admin_roles_for_someone_else()
    {
        var repository = new FakeUserRepository();
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", Role = UserRole.Student };
        await repository.AddAsync(user);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(CommandFor(user, "Instructor", callerUserId: Guid.NewGuid()));

        Assert.True(result.Success);
        Assert.Equal(UserRole.Instructor, result.User!.Role);
    }

    [Fact]
    public async Task Concurrent_duplicate_email_update_returns_conflict_instead_of_throwing()
    {
        // Simulates two concurrent Update requests racing the existingUser
        // pre-check onto the same new email - the loser should still get a
        // clean Conflict result, not an unhandled 500.
        var repository = new FakeUserRepository { ThrowDuplicateKeyOnNextSaveChanges = true };
        var user = new AppUser { FullName = "Jane Doe", Email = "jane@example.com", Role = UserRole.Student };
        await repository.AddAsync(user);
        var handler = CreateHandler(repository);

        var result = await handler.HandleAsync(CommandFor(user, "Student", callerUserId: Guid.NewGuid()));

        Assert.False(result.Success);
        Assert.True(result.EmailAlreadyExists);
    }
}
