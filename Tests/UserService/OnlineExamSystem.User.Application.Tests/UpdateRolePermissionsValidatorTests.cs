using OnlineExamSystem.User.Application.Users.RolePermissions.Update;
using Xunit;

namespace OnlineExamSystem.User.Application.Tests;

// Guards the defense-in-depth tightening: a tenant's own Admin self-service
// editor (RolesController) should only ever write a RolePermission row for
// one of the 3 real tenant-assignable roles - "Super Admin"/"Viewer" aren't
// real roles a tenant's own users can hold.
public class UpdateRolePermissionsValidatorTests
{
    private readonly UpdateRolePermissionsValidator _validator = new();

    [Theory]
    [InlineData("Admin")]
    [InlineData("Instructor")]
    [InlineData("Student")]
    public void Accepts_tenant_assignable_roles(string role)
    {
        var command = new UpdateRolePermissionsCommand(Guid.NewGuid(), role, ["Dashboard - View"], Guid.NewGuid());

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("Super Admin")]
    [InlineData("Viewer")]
    [InlineData("NotARole")]
    public void Rejects_non_tenant_assignable_roles(string role)
    {
        var command = new UpdateRolePermissionsCommand(Guid.NewGuid(), role, ["Dashboard - View"], Guid.NewGuid());

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Rejects_unknown_permission_keys()
    {
        var command = new UpdateRolePermissionsCommand(Guid.NewGuid(), "Admin", ["Not - A Real Key"], Guid.NewGuid());

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
