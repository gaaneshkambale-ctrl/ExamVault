using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.RolePermissions.Update;

public class UpdateRolePermissionsHandler
{
    private readonly IRolePermissionRepository _rolePermissionRepository;
    private readonly IValidator<UpdateRolePermissionsCommand> _validator;

    public UpdateRolePermissionsHandler(
        IRolePermissionRepository rolePermissionRepository,
        IValidator<UpdateRolePermissionsCommand> validator)
    {
        _rolePermissionRepository = rolePermissionRepository;
        _validator = validator;
    }

    public async Task<UpdateRolePermissionsResult> HandleAsync(
        UpdateRolePermissionsCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateRolePermissionsResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var distinctPermissions = command.Permissions.Distinct().ToList();
        var updatedAtUtc = DateTime.UtcNow;
        await _rolePermissionRepository.ReplaceForRoleAsync(
            command.TenantId,
            command.Role,
            distinctPermissions,
            updatedAtUtc,
            command.UpdatedByUserId,
            cancellationToken);
        await _rolePermissionRepository.SaveChangesAsync(cancellationToken);

        return UpdateRolePermissionsResult.Ok(distinctPermissions, updatedAtUtc);
    }
}
