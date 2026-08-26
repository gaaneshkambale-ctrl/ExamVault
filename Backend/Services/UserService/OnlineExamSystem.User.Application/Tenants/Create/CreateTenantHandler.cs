using FluentValidation;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.Create;

public class CreateTenantHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<CreateTenantCommand> _validator;

    public CreateTenantHandler(ITenantRepository tenantRepository, IValidator<CreateTenantCommand> validator)
    {
        _tenantRepository = tenantRepository;
        _validator = validator;
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

        var tenant = new Tenant
        {
            Name = command.Name,
            Slug = command.Slug,
            PlanId = command.PlanId ?? TenantConstants.FullAccessPlanId,
        };
        await _tenantRepository.AddAsync(tenant, cancellationToken);
        await _tenantRepository.SaveChangesAsync(cancellationToken);

        return CreateTenantResult.Ok(tenant);
    }
}
