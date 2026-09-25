using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.ConfirmEmail;

// The confirm step of the self-registration email-confirmation flow (see
// RegisterUserHandler for the issuing step). Unlike ForgotPasswordHandler's
// request step, a wrong/expired token here is safe to report as such -
// possessing the token already proves the caller received the email, so
// there's nothing left to avoid revealing (same reasoning
// ResetPasswordWithTokenHandler documents for itself).
public class ConfirmEmailHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<ConfirmEmailCommand> _validator;
    private readonly IJwtTokenService _jwtTokenService;

    public ConfirmEmailHandler(
        IUserRepository userRepository,
        IValidator<ConfirmEmailCommand> validator,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _validator = validator;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<ConfirmEmailResult> HandleAsync(
        ConfirmEmailCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ConfirmEmailResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var tokenHash = _jwtTokenService.HashToken(command.Token);
        var confirmationToken = await _userRepository.GetEmailConfirmationTokenByHashAsync(tokenHash, cancellationToken);
        if (confirmationToken is null)
        {
            return ConfirmEmailResult.InvalidOrExpiredToken();
        }

        var user = await _userRepository.GetByIdAsync(confirmationToken.UserId, cancellationToken);
        if (user is null)
        {
            return ConfirmEmailResult.InvalidOrExpiredToken();
        }

        // A used-but-already-confirmed token means the caller clicked the
        // same link twice (or it's still open in two tabs) - a friendlier
        // "you're all set" than a genuinely bad/expired link, even though
        // IsValid is false in both cases.
        if (!confirmationToken.IsValid)
        {
            return user.EmailConfirmed ? ConfirmEmailResult.AlreadyConfirmedResult() : ConfirmEmailResult.InvalidOrExpiredToken();
        }

        user.EmailConfirmed = true;
        confirmationToken.UsedAtUtc = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);

        return ConfirmEmailResult.Ok();
    }
}
