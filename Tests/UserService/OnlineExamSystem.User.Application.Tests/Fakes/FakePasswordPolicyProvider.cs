using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Security;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakePasswordPolicyProvider : IPasswordPolicyProvider
{
    public PasswordPolicy Policy { get; set; } = PasswordPolicy.Default;

    public Task<PasswordPolicy> GetPolicyAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(Policy);
}
