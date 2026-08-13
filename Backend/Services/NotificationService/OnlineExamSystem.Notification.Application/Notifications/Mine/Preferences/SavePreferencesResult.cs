namespace OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;

public class SavePreferencesResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();

    public static SavePreferencesResult Ok() => new() { Success = true };

    public static SavePreferencesResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };
}
