namespace OnlineExamSystem.User.Application.Security;

/// <summary>Pure policy logic, no DB access - resolved per-request by
/// IPasswordPolicyProvider from the real PlatformSettings row (Security
/// Settings > Password Policy), with Default as the safe fallback before that
/// row exists or if the settings service is unreachable. Mirrors exactly the
/// rules RegisterUserValidator/ResetPasswordValidator/ChangePasswordValidator
/// used to hardcode individually - this is now their single source of truth.</summary>
public record PasswordPolicy(
    int MinLength,
    bool RequireUppercase,
    bool RequireLowercase,
    bool RequireDigit,
    bool RequireSpecialChar)
{
    public static readonly PasswordPolicy Default = new(8, true, true, true, false);

    public IReadOnlyList<string> Validate(string? password)
    {
        var errors = new List<string>();
        if (string.IsNullOrEmpty(password) || password.Length < MinLength)
        {
            errors.Add($"Password must be at least {MinLength} characters long.");
        }
        if (RequireUppercase && (password is null || !password.Any(char.IsUpper)))
        {
            errors.Add("Password must contain at least one uppercase letter.");
        }
        if (RequireLowercase && (password is null || !password.Any(char.IsLower)))
        {
            errors.Add("Password must contain at least one lowercase letter.");
        }
        if (RequireDigit && (password is null || !password.Any(char.IsDigit)))
        {
            errors.Add("Password must contain at least one digit.");
        }
        if (RequireSpecialChar && (password is null || password.All(char.IsLetterOrDigit)))
        {
            errors.Add("Password must contain at least one special character.");
        }
        return errors;
    }
}
