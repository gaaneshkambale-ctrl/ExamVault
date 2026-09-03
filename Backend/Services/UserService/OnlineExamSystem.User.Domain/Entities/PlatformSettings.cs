using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.User.Domain.Entities;

/// <summary>Single global row backing the Super Admin's Platform/Tenant/Email/
/// Notification/Security Settings pages - deliberately BaseEntity, not
/// TenantScopedEntity: this is platform-wide, not per-organization, and there is
/// no existing precedent in this codebase for a tenant-less singleton table, so a
/// plain single-row table (always looked up via GetAsync/GetOrCreateAsync with no
/// filter) is the simplest honest shape. Every field here is actually read and
/// enforced somewhere (password policy by the 3 password validators, lockout by
/// LoginUserHandler, session timeout by JwtTokenService via LoginUserHandler,
/// maintenance mode by LoginUserHandler, self-registration by RegisterUserHandler,
/// tenant defaults by CreateTenantHandler/StartTrialButton, N8n webhook by
/// N8nEmailDispatcher, notification defaults by NotificationService's
/// UserRegisteredEvent handler) - nothing here is stored-and-ignored.</summary>
public class PlatformSettings : BaseEntity
{
    public string PlatformName { get; set; } = "ExamVault";
    public string PlatformTagline { get; set; } = string.Empty;

    public bool AllowSelfRegistration { get; set; } = true;
    public bool MaintenanceModeEnabled { get; set; }

    public int PasswordMinLength { get; set; } = 8;
    public bool PasswordRequireUppercase { get; set; } = true;
    public bool PasswordRequireLowercase { get; set; } = true;
    public bool PasswordRequireDigit { get; set; } = true;
    public bool PasswordRequireSpecialChar { get; set; }

    public int SessionTimeoutMinutes { get; set; } = 15;
    public int MaxLoginAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;

    public int DefaultTrialDurationDays { get; set; } = 15;
    public int? DefaultMaxUsers { get; set; }
    public int? DefaultMaxExams { get; set; }
    public int? DefaultMaxStudents { get; set; }

    public string? N8nWebhookUrl { get; set; }

    public bool DefaultInAppNotificationsEnabled { get; set; } = true;
    public bool DefaultEmailNotificationsEnabled { get; set; } = true;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
