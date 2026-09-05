using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Security;

public class PasswordPolicyProvider : IPasswordPolicyProvider
{
    private readonly IPlatformSettingsRepository _platformSettingsRepository;

    public PasswordPolicyProvider(IPlatformSettingsRepository platformSettingsRepository)
    {
        _platformSettingsRepository = platformSettingsRepository;
    }

    public async Task<PasswordPolicy> GetPolicyAsync(CancellationToken cancellationToken = default)
    {
        // Read-only lookup (GetAsync, not GetOrCreateAsync) - this runs on the
        // hot Register/ResetPassword/ChangePassword path and must never create a
        // row as a side effect of an unrelated request. No row yet = the same
        // rules those 3 validators hardcoded before this existed.
        var settings = await _platformSettingsRepository.GetAsync(cancellationToken);
        if (settings is null)
        {
            return PasswordPolicy.Default;
        }

        return new PasswordPolicy(
            settings.PasswordMinLength,
            settings.PasswordRequireUppercase,
            settings.PasswordRequireLowercase,
            settings.PasswordRequireDigit,
            settings.PasswordRequireSpecialChar);
    }
}
