using OnlineExamSystem.User.Application.Users.Create;
using OnlineExamSystem.User.Application.Users.Update;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

// Guards the privilege-escalation fix: a tenant Admin (who reaches both
// Create/Update via [Authorize(Roles="Admin")] + Policy=UsersEdit) must
// never be able to set a user's role to the platform-level SuperAdmin -
// only the 3 real tenant-assignable roles are accepted.
public class UserRoleValidationTests
{
    private readonly CreateUserValidator _createValidator = new();
    private readonly UpdateUserValidator _updateValidator = new();

    [Theory]
    [InlineData("Admin")]
    [InlineData("Instructor")]
    [InlineData("Student")]
    public void Create_accepts_tenant_assignable_roles(string role)
    {
        var command = new CreateUserCommand(Guid.NewGuid(), "Jane Doe", "jane@example.com", role);

        var result = _createValidator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("SuperAdmin")]
    [InlineData("Super Admin")]
    [InlineData("Viewer")]
    [InlineData("NotARole")]
    public void Create_rejects_non_tenant_assignable_roles(string role)
    {
        var command = new CreateUserCommand(Guid.NewGuid(), "Jane Doe", "jane@example.com", role);

        var result = _createValidator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Instructor")]
    [InlineData("Student")]
    public void Update_accepts_tenant_assignable_roles(string role)
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), "Jane Doe", "jane@example.com", role);

        var result = _updateValidator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("SuperAdmin")]
    [InlineData("Super Admin")]
    [InlineData("Viewer")]
    public void Update_rejects_non_tenant_assignable_roles(string role)
    {
        var command = new UpdateUserCommand(Guid.NewGuid(), "Jane Doe", "jane@example.com", role);

        var result = _updateValidator.Validate(command);

        Assert.False(result.IsValid);
    }
}
