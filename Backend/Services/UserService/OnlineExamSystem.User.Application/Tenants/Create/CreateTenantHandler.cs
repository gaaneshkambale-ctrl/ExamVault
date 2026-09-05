using FluentValidation;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.Create;

public class CreateTenantHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<CreateTenantCommand> _validator;
    private readonly IPlanRepository _planRepository;

    public CreateTenantHandler(
        ITenantRepository tenantRepository,
        IValidator<CreateTenantCommand> validator,
        IPlanRepository planRepository)
    {
        _tenantRepository = tenantRepository;
        _validator = validator;
        _planRepository = planRepository;
    }

    public async Task<CreateTenantResult> HandleAsync(
        CreateTenantCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateTenantResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var existing = await _tenantRepository.GetBySlugAsync(command.Slug, cancellationToken);
        if (existing is not null)
        {
            return CreateTenantResult.Conflict();
        }

        // The tenant's effective limits are seeded from the assigned Plan's
        // own Max* fields (the entitlement source) - PlatformSettings'
        // DefaultMaxUsers/DefaultMaxExams/DefaultMaxStudents are no longer
        // read here. Those fields still exist (Platform Settings' "Tenant
        // Defaults" section is untouched in this pass), they're just
        // effectively dead now - flagged as a real follow-up (deprecate/
        // clean up), not silently deleted alongside this change.
        var planId = command.PlanId ?? TenantConstants.FullAccessPlanId;
        var plan = await _planRepository.GetByIdAsync(planId, cancellationToken);

        var tenant = new Tenant
        {
            // MaxUsers (the pre-existing flat, all-roles safety net) is
            // deliberately left unseeded here - Plan has no field it maps
            // to (only the four granular per-role/resource limits below
            // were asked for). It stays a supported manual override on the
            // tenant if a Super Admin sets one directly; CreateUserHandler's
            // existing flat check keeps working unchanged either way.
            MaxExams = plan?.MaxExams,
            MaxStudents = plan?.MaxStudents,
            MaxAdmins = plan?.MaxAdmins,
            MaxInstructors = plan?.MaxInstructors,
            Name = command.Name,
            Slug = command.Slug,
            PlanId = planId,
            // Starts Inactive - activated automatically once its admin
            // completes their forced first password change
            // (ChangePasswordHandler), or manually via Reactivate.
            IsActive = false,
            IsTrial = command.IsTrial,
            TrialEndsAtUtc = command.IsTrial ? command.TrialEndsAtUtc : null,
            OrganizationCode = await OrganizationCodeGenerator.GenerateAsync(command.Name, _tenantRepository, cancellationToken),
            OrganizationType = string.IsNullOrWhiteSpace(command.OrganizationType) ? null : command.OrganizationType.Trim(),
            AddressLine1 = string.IsNullOrWhiteSpace(command.AddressLine1) ? null : command.AddressLine1.Trim(),
            AddressLine2 = string.IsNullOrWhiteSpace(command.AddressLine2) ? null : command.AddressLine2.Trim(),
            City = string.IsNullOrWhiteSpace(command.City) ? null : command.City.Trim(),
            State = string.IsNullOrWhiteSpace(command.State) ? null : command.State.Trim(),
            PostalCode = string.IsNullOrWhiteSpace(command.PostalCode) ? null : command.PostalCode.Trim(),
            Country = string.IsNullOrWhiteSpace(command.Country) ? null : command.Country.Trim(),
            CreatedByUserId = command.CreatedByUserId,
        };
        await _tenantRepository.AddAsync(tenant, cancellationToken);
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return CreateTenantResult.Ok(tenant);
    }
}
