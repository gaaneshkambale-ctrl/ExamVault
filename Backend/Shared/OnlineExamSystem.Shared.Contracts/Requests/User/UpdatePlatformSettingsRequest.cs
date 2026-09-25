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
    bool DefaultEmailNotificationsEnabled,
    // Nullable and trailing: a client that predates this field (an already-
    // open settings page) omits it, and null keeps the stored value rather
    // than silently switching verification off.
    bool? RequireEmailVerification = null);
