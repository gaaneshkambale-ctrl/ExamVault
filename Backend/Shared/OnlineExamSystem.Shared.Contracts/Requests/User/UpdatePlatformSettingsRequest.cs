namespace OnlineExamSystem.Shared.Contracts.Requests.User;

public record UpdatePlatformSettingsRequest(
    string PlatformName,
    string PlatformTagline,
    bool AllowSelfRegistration,
    bool MaintenanceModeEnabled,
    int PasswordMinLength,
    bool PasswordRequireUppercase,
    bool PasswordRequireLowercase,
    bool PasswordRequireDigit,
    bool PasswordRequireSpecialChar,
    int SessionTimeoutMinutes,
    int MaxLoginAttempts,
    int LockoutMinutes,
    int DefaultTrialDurationDays,
    int? DefaultMaxUsers,
    int? DefaultMaxExams,
    int? DefaultMaxStudents,
    string? N8nWebhookUrl,
    bool DefaultInAppNotificationsEnabled,
    bool DefaultEmailNotificationsEnabled);
