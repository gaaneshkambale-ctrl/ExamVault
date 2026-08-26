using SystemSettingsEntity = OnlineExamSystem.Notification.Domain.Entities.SystemSettings;

namespace OnlineExamSystem.Notification.Application.Settings.UpdateSystemSettings;

public class UpdateSystemSettingsResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public SystemSettingsEntity? Settings { get; init; }

    public static UpdateSystemSettingsResult Ok(SystemSettingsEntity settings) =>
        new() { Success = true, Settings = settings };

    public static UpdateSystemSettingsResult Invalid(IReadOnlyList<string> errors) =>
        new() { ValidationErrors = errors };
}
