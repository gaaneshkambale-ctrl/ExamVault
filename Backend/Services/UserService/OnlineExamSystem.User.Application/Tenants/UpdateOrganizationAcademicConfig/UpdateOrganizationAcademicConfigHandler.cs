using System.Text.Json;
using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Tenants.UpdateOrganizationAcademicConfig;

public class UpdateOrganizationAcademicConfigHandler
{
    private readonly IOrganizationAcademicConfigRepository _repository;
    private readonly IValidator<UpdateOrganizationAcademicConfigCommand> _validator;

    public UpdateOrganizationAcademicConfigHandler(
        IOrganizationAcademicConfigRepository repository,
        IValidator<UpdateOrganizationAcademicConfigCommand> validator)
    {
        _repository = repository;
        _validator = validator;
    }

    public async Task<UpdateOrganizationAcademicConfigResult> HandleAsync(
        UpdateOrganizationAcademicConfigCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return UpdateOrganizationAcademicConfigResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var config = await _repository.GetByTenantIdAsync(command.TenantId, cancellationToken);
        var academicFieldsJson = JsonSerializer.Serialize(command.AcademicFields);
        var resultFieldsJson = JsonSerializer.Serialize(command.ResultFields);

        if (config is null)
        {
            config = new OrganizationAcademicConfig
            {
                TenantId = command.TenantId,
                AcademicFieldsJson = academicFieldsJson,
                ResultFieldsJson = resultFieldsJson,
                UpdatedByUserId = command.UpdatedByUserId,
            };
            await _repository.AddAsync(config, cancellationToken);
        }
        else
        {
            config.AcademicFieldsJson = academicFieldsJson;
            config.ResultFieldsJson = resultFieldsJson;
            config.UpdatedAtUtc = DateTime.UtcNow;
            config.UpdatedByUserId = command.UpdatedByUserId;
        }

        await _repository.SaveChangesAsync(cancellationToken);

        return UpdateOrganizationAcademicConfigResult.Ok(command.AcademicFields, command.ResultFields, config.UpdatedAtUtc);
    }
}
