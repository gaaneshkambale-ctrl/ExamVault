using OnlineExamSystem.User.Application.Security;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IPasswordPolicyProvider
{
    Task<PasswordPolicy> GetPolicyAsync(CancellationToken cancellationToken = default);
}
