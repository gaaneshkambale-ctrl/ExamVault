using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tenants.GetLimits;

public record TenantLimits(int? MaxUsers, int? MaxExams, int? MaxStudents);

// Backs InternalTenantsController's cross-service "limits" lookup - the
// real Tenant Settings > Default Limits enforcement point other services
// (ExamService's CreateExamHandler) call to check MaxExams etc.
public class GetTenantLimitsHandler
{
    private readonly ITenantRepository _tenantRepository;

    public GetTenantLimitsHandler(ITenantRepository tenantRepository)
    {
        _tenantRepository = tenantRepository;
    }

    public async Task<TenantLimits?> HandleAsync(GetTenantLimitsQuery query, CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(query.TenantId, cancellationToken);
        return tenant is null ? null : new TenantLimits(tenant.MaxUsers, tenant.MaxExams, tenant.MaxStudents);
    }
}
