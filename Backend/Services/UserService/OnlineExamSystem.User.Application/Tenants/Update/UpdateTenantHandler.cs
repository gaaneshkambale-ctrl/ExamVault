using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.Update;

public class UpdateTenantHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<UpdateTenantCommand> _validator;

    public UpdateTenantHandler(ITenantRepository tenantRepository, IValidator<UpdateTenantCommand> validator)
    {
        _tenantRepository = tenantRepository;
        _validator = validator;
    }

    public async Task<UpdateTenantResult> HandleAsync(
        UpdateTenantCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateTenantResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return UpdateTenantResult.NotFound();
        }

        var slugOwner = await _tenantRepository.GetBySlugAsync(command.Slug, cancellationToken);
        if (slugOwner is not null && slugOwner.Id != command.TenantId)
        {
            return UpdateTenantResult.Conflict();
        }

        tenant.Name = command.Name;
        tenant.Slug = command.Slug;
        tenant.OrganizationCode = string.IsNullOrWhiteSpace(command.OrganizationCode) ? null : command.OrganizationCode.Trim();
        tenant.OrganizationType = string.IsNullOrWhiteSpace(command.OrganizationType) ? null : command.OrganizationType.Trim();
        tenant.AddressLine1 = string.IsNullOrWhiteSpace(command.AddressLine1) ? null : command.AddressLine1.Trim();
        tenant.AddressLine2 = string.IsNullOrWhiteSpace(command.AddressLine2) ? null : command.AddressLine2.Trim();
        tenant.City = string.IsNullOrWhiteSpace(command.City) ? null : command.City.Trim();
        tenant.State = string.IsNullOrWhiteSpace(command.State) ? null : command.State.Trim();
        tenant.PostalCode = string.IsNullOrWhiteSpace(command.PostalCode) ? null : command.PostalCode.Trim();
        tenant.Country = string.IsNullOrWhiteSpace(command.Country) ? null : command.Country.Trim();
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return UpdateTenantResult.Ok(tenant);
    }
}
