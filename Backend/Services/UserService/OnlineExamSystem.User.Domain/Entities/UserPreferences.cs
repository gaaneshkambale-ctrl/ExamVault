using OnlineExamSystem.Shared.Common.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Domain.Entities;

// Per-user row (UserId unique index) - deliberately NOT the same thing as
// ExamService's global GeneralSettings singleton built for the Settings
// hub. That's one org-wide row; this is one row per user, for their own
// personal display preferences.
public class UserPreferences : BaseEntity
{
    public Guid UserId { get; set; }
    public string Language { get; set; } = "English (United States)";
    public string Timezone { get; set; } = "UTC";
    public string DateFormat { get; set; } = "DD MMM YYYY";
    public TimeFormat TimeFormat { get; set; } = TimeFormat.Hour12;
    public AppTheme Theme { get; set; } = AppTheme.System;
}
