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
    }
}
