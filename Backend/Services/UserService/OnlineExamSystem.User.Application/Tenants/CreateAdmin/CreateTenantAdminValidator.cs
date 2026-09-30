using FluentValidation;

namespace OnlineExamSystem.User.Application.Tenants.CreateAdmin;

public class CreateTenantAdminValidator : AbstractValidator<CreateTenantAdminCommand>
{
    public CreateTenantAdminValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(256);

        RuleFor(x => x.PhoneNumber)
            .Matches(@"^[0-9+\-\s()]{7,20}$")
            .WithMessage("Enter a valid phone number.")
            .When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber));

        RuleFor(x => x.Designation).MaximumLength(100);
    }
}
