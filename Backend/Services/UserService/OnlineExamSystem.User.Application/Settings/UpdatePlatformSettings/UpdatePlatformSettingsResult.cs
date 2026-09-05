using PlatformSettingsEntity = OnlineExamSystem.User.Domain.Entities.PlatformSettings;

namespace OnlineExamSystem.User.Application.Settings.UpdatePlatformSettings;

public class UpdatePlatformSettingsResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> ValidationErrors { get; init; } = Array.Empty<string>();
    public PlatformSettingsEntity? Settings { get; init; }

    public static UpdatePlatformSettingsResult Ok(PlatformSettingsEntity settings) => new() { Success = true, Settings = settings };

    public static UpdatePlatformSettingsResult Invalid(IReadOnlyList<string> errors) =>
        new() { Success = false, ValidationErrors = errors };
}
