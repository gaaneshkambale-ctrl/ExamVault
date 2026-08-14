using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.SetActiveStatus;

public class SetUserActiveStatusHandler
{
    private readonly IUserRepository _userRepository;

    public SetUserActiveStatusHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<SetUserActiveStatusResult> HandleAsync(
        SetUserActiveStatusCommand command,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return SetUserActiveStatusResult.NotFound();
        }

        user.IsActive = command.IsActive;

        // Deactivating must actually end any session in progress, not just
        // block future logins - a deactivated user's next refresh attempt
        // hits this immediately instead of waiting out their access token.
        if (!command.IsActive)
        {
            await _userRepository.RevokeAllRefreshTokensForUserAsync(user.Id, cancellationToken);
        }

        await _userRepository.SaveChangesAsync(cancellationToken);

        return SetUserActiveStatusResult.Ok(user);
    }
}
