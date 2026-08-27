using FluentValidation;

namespace OnlineExamSystem.User.Application.Tenants.Update;

public class UpdateTenantValidator : AbstractValidator<UpdateTenantCommand>
{
    public UpdateTenantValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        // Same DNS-label-safe rule as CreateTenantValidator - Slug is still the
        // subdomain, editing it must not be able to produce an unroutable one.
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(100)
            .Matches("^[a-z0-9]+(-[a-z0-9]+)*$")
            .WithMessage("Slug must be lowercase letters, numbers, and hyphens only (e.g. \"stanford\").");
    }
}
