using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeCurrentTenant : ICurrentTenant
{
    public bool IsAuthenticated { get; set; } = true;
    public Guid TenantId { get; set; } = Guid.NewGuid();
    public bool IsSuperAdmin { get; set; }
}
