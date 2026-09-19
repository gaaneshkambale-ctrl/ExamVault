using OnlineExamSystem.Result.Application.Interfaces;

namespace OnlineExamSystem.Result.Application.Tests.Fakes;

public class FakeSystemTokenProvider : ISystemTokenProvider
{
    public string CreateToken(Guid tenantId) => $"fake-system-token-{tenantId}";
}
