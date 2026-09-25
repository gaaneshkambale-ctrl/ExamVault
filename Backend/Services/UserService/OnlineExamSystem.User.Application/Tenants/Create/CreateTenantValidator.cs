using FluentValidation;

namespace OnlineExamSystem.User.Application.Tenants.Create;

public class CreateTenantValidator : AbstractValidator<CreateTenantCommand>
{
    // Must be kept in sync by hand with the Gateway's own reserved list
    // (OnlineExamSystem.ApiGateway/Multitenancy/TenantResolutionMiddleware.cs's
    // ReservedSlugs) - those three hostnames are excluded from tenant
    // subdomain resolution there, so a tenant created with one of these as
    // its Slug would be permanently unreachable at its own subdomain
    // (requests to it always fall through unresolved instead of routing to
    // this tenant). The two services don't share a project for this today,
    // so this list is duplicated rather than referenced.
    private static readonly string[] ReservedSlugs = ["platform", "api", "www"];

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
            .WithMessage("Slug must be lowercase letters, numbers, and hyphens only (e.g. \"stanford\").")
            .Must(slug => !ReservedSlugs.Contains(slug.ToLowerInvariant()))
            .WithMessage("This subdomain is reserved and can't be used.");

        RuleFor(x => x.TrialEndsAtUtc)
            .NotNull()
            .GreaterThan(_ => DateTime.UtcNow)
            .When(x => x.IsTrial)
            .WithMessage("Trial end date must be set and in the future.");

        RuleFor(x => x.OrganizationType)
            .NotEmpty()
            .WithMessage("Organization Type is required.")
            .MaximumLength(100);
        RuleFor(x => x.AddressLine1).MaximumLength(200);
        RuleFor(x => x.AddressLine2).MaximumLength(200);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.PostalCode).MaximumLength(20);
        RuleFor(x => x.Country).MaximumLength(100);
    }
}
