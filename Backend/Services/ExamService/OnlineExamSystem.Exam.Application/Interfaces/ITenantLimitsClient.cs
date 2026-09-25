namespace OnlineExamSystem.Exam.Application.Interfaces;

public record TenantLimits(int? MaxUsers, int? MaxExams, int? MaxStudents);

/// <summary>Real Tenant Settings > Default Limits "Max Exams" enforcement point -
/// hits UserService's anonymous internal-only /internal/tenants/{id}/limits
/// endpoint (same network-isolation pattern as IInternalUserLookupClient),
/// since ExamService has no database access to the Tenant table.</summary>
public interface ITenantLimitsClient
{
    Task<TenantLimits?> GetLimitsAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
