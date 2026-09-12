using FluentValidation;
using OnlineExamSystem.User.Application.Users.RolePermissions;

namespace OnlineExamSystem.User.Application.Users.Update;

public class UpdateUserValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        // Deliberately NOT IsEnumName(typeof(UserRole)) - that would accept
        // "SuperAdmin", letting a tenant's own Admin (who reaches this via
        // [Authorize(Roles="Admin")] + Policy=UsersEdit) hand themselves or
        // any other user in their tenant the platform-level SuperAdmin role.
        // Only the 3 real tenant-assignable roles may ever be set here.
        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(role => RolePermissionCatalog.TenantAssignableRoles
                .Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase)))
            .WithMessage("Unknown role.");

        RuleFor(x => x.PhoneNumber)
            .Matches(@"^[0-9+\-\s()]{7,20}$")
            .WithMessage("Enter a valid phone number.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));

        RuleFor(x => x.RollNumber)
            .MaximumLength(40);
    }
}
