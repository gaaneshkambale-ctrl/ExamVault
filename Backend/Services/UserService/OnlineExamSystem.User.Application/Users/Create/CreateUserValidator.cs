using FluentValidation;
using OnlineExamSystem.User.Application.Users.RolePermissions;

namespace OnlineExamSystem.User.Application.Users.Create;

public class CreateUserValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserValidator()
    {
        // Matches the Add User wizard's own NAME_PATTERN
        // (createUserValidation.ts) - must start with a letter, then any run
        // of letters/spaces/periods/apostrophes/hyphens, so "Jean-Luc",
        // "O'Brien" and "A. Sharma" are all still valid, but a pure-digit or
        // symbol-only string isn't.
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200)
            .Matches(@"^\p{L}[\p{L} .'-]{1,199}$")
            .WithMessage("Enter a valid name.");

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

        RuleFor(x => x.RollNumber)
            .MaximumLength(40);

        // Roll No. is already a mandatory, always-visible field in the
        // Student "Academic Details" step of the Add User wizard - enforce
        // it here too so a direct API call can't create a Student without
        // one. Not required for Admin/Instructor, who never see this field.
        RuleFor(x => x.RollNumber)
            .NotEmpty()
            .WithMessage("Roll number is required for students.")
            .When(x => string.Equals(x.Role, "Student", StringComparison.OrdinalIgnoreCase));

        // Phone Number is mandatory in the Add User wizard's Step 1 for
        // every role - enforce it here too, matching Email's pattern above.
        RuleFor(x => x.PhoneNumber)
            .NotEmpty()
            .WithMessage("Phone number is required.")
            .Matches(@"^[0-9+\-\s()]{7,20}$")
            .WithMessage("Enter a valid phone number.");
    }
}
