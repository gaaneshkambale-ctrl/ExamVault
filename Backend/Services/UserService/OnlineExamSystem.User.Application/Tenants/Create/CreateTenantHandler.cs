using FluentValidation;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.Create;

public class CreateTenantHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<CreateTenantCommand> _validator;
    private readonly IPlatformSettingsRepository _platformSettingsRepository;

    public CreateTenantHandler(
        ITenantRepository tenantRepository,
        IValidator<CreateTenantCommand> validator,
        IPlatformSettingsRepository platformSettingsRepository)
    {
        _tenantRepository = tenantRepository;
        _validator = validator;
        _platformSettingsRepository = platformSettingsRepository;
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

        // Real Tenant Settings > Default Limits - read-only lookup, no row
        // created as a side effect. Null settings (no admin has visited
        // Settings yet) means every new tenant stays unlimited, same as
        // before this existed.
        var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);

        var tenant = new Tenant
        {
            MaxUsers = platformSettings?.DefaultMaxUsers,
            MaxExams = platformSettings?.DefaultMaxExams,
            MaxStudents = platformSettings?.DefaultMaxStudents,
            Name = command.Name,
            Slug = command.Slug,
            PlanId = command.PlanId ?? TenantConstants.FullAccessPlanId,
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
        };
        await _tenantRepository.AddAsync(tenant, cancellationToken);
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return CreateTenantResult.Ok(tenant);
    }
}
