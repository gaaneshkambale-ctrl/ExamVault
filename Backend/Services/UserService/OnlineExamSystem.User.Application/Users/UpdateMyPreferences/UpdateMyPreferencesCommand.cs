namespace OnlineExamSystem.User.Application.Users.UpdateMyPreferences;

public record UpdateMyPreferencesCommand(
    Guid UserId,
    string Language,
    string Timezone,
    string DateFormat,
    string TimeFormat);
