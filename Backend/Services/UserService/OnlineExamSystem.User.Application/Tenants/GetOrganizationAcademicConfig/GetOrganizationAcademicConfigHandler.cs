using System.Text.Json;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.GetOrganizationAcademicConfig;

public class GetOrganizationAcademicConfigHandler
{
    private readonly IOrganizationAcademicConfigRepository _repository;

    public GetOrganizationAcademicConfigHandler(IOrganizationAcademicConfigRepository repository)
    {
        _repository = repository;
    }

    public async Task<(Dictionary<string, string> AcademicFields, List<string> ResultFields, DateTime? UpdatedAtUtc)> HandleAsync(
        GetOrganizationAcademicConfigQuery query,
        CancellationToken cancellationToken = default)
    {
        var config = await _repository.GetByTenantIdAsync(query.TenantId, cancellationToken);
        if (config is null)
        {
            // No config saved yet - a brand-new tenant has nothing to show,
            // not an error.
            return (new Dictionary<string, string>(), new List<string>(), null);
        }

        var academicFields = JsonSerializer.Deserialize<Dictionary<string, string>>(config.AcademicFieldsJson) ?? new();
        var resultFields = JsonSerializer.Deserialize<List<string>>(config.ResultFieldsJson) ?? new();
        return (academicFields, resultFields, config.UpdatedAtUtc);
    }
}
