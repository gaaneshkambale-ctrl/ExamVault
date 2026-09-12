using FluentValidation;

namespace OnlineExamSystem.User.Application.Users.RolePermissions.Update;

public class UpdateRolePermissionsValidator : AbstractValidator<UpdateRolePermissionsCommand>
{
    public UpdateRolePermissionsValidator()
    {
        // TenantAssignableRoles (Admin/Instructor/Student), not the full
        // Roles catalog - "Super Admin"/"Viewer" aren't real roles a tenant's
        // own users can ever hold, so a tenant Admin shouldn't be able to
        // write a RolePermission row for them, even though today it would be
        // inert (real authorization resolves permissions from the caller's
        // actual UserRole enum value, never from an arbitrary role-named row).
        RuleFor(x => x.Role)
            .Must(role => RolePermissionCatalog.TenantAssignableRoles.Contains(role))
            .WithMessage("Unknown role.");

        RuleForEach(x => x.Permissions)
            .Must(key => RolePermissionCatalog.Permissions.Contains(key))
            .WithMessage("Unknown permission key.");
    }
}
