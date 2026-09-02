using FluentValidation;

namespace OnlineExamSystem.User.Application.Users.RolePermissions.Update;

public class UpdateRolePermissionsValidator : AbstractValidator<UpdateRolePermissionsCommand>
{
    public UpdateRolePermissionsValidator()
    {
        RuleFor(x => x.Role)
            .Must(role => RolePermissionCatalog.Roles.Contains(role))
            .WithMessage("Unknown role.");

        RuleForEach(x => x.Permissions)
            .Must(key => RolePermissionCatalog.Permissions.Contains(key))
            .WithMessage("Unknown permission key.");
    }
}
