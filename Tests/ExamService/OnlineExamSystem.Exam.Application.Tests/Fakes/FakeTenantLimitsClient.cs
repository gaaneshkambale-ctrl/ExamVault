using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeTenantLimitsClient : ITenantLimitsClient
{
    public TenantLimits? Limits { get; set; }

    public Task<TenantLimits?> GetLimitsAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
        Task.FromResult(Limits);
}
