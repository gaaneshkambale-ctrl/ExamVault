using FluentValidation;

namespace OnlineExamSystem.User.Application.Tenants.Create;

public class CreateTenantValidator : AbstractValidator<CreateTenantCommand>
{
    public CreateTenantValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        // Slug becomes the subdomain (Phase 3) - keep it DNS-label-safe now
        // rather than relaxing validation later once routing depends on it.
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(100)
            .Matches("^[a-z0-9]+(-[a-z0-9]+)*$")
            .WithMessage("Slug must be lowercase letters, numbers, and hyphens only (e.g. \"stanford\").");

        RuleFor(x => x.TrialEndsAtUtc)
            .NotNull()
            .GreaterThan(_ => DateTime.UtcNow)
            .When(x => x.IsTrial)
            .WithMessage("Trial end date must be set and in the future.");

        RuleFor(x => x.OrganizationType).MaximumLength(100);
        RuleFor(x => x.AddressLine1).MaximumLength(200);
        RuleFor(x => x.AddressLine2).MaximumLength(200);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.PostalCode).MaximumLength(20);
        RuleFor(x => x.Country).MaximumLength(100);
    }
}
