using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
using TimeFormatEnum = OnlineExamSystem.User.Domain.Enums.TimeFormat;

namespace OnlineExamSystem.User.Application.Users.UpdateMyPreferences;

public class UpdateMyPreferencesHandler
{
    private readonly IUserRepository _userRepository;

    public UpdateMyPreferencesHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserPreferences> HandleAsync(
        UpdateMyPreferencesCommand command,
        CancellationToken cancellationToken = default)
    {
        var preferences = await _userRepository.GetOrCreateUserPreferencesAsync(command.UserId, cancellationToken);
        preferences.Language = command.Language;
        preferences.Timezone = command.Timezone;
        preferences.DateFormat = command.DateFormat;
        preferences.TimeFormat = Enum.Parse<TimeFormatEnum>(command.TimeFormat, ignoreCase: true);
        preferences.Theme = Enum.Parse<AppTheme>(command.Theme, ignoreCase: true);

        await _userRepository.SaveChangesAsync(cancellationToken);

        return preferences;
    }
}
