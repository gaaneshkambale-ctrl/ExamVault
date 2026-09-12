using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.ResetPasswordWithToken;

// The confirm step of the self-service "forgot password" flow (see
// ForgotPasswordHandler for the request step). Unlike that step, a wrong/
// expired token here is safe to report as such - possessing the token
// already proves the caller received the email, so there's nothing left to
// avoid revealing.
public class ResetPasswordWithTokenHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<ResetPasswordWithTokenCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public ResetPasswordWithTokenHandler(
        IUserRepository userRepository,
        IValidator<ResetPasswordWithTokenCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<ResetPasswordWithTokenResult> HandleAsync(
        ResetPasswordWithTokenCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ResetPasswordWithTokenResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var tokenHash = _jwtTokenService.HashToken(command.Token);
        var resetToken = await _userRepository.GetPasswordResetTokenByHashAsync(tokenHash, cancellationToken);
        if (resetToken is null || !resetToken.IsValid)
        {
            return ResetPasswordWithTokenResult.InvalidOrExpiredToken();
        }

        var user = await _userRepository.GetByIdAsync(resetToken.UserId, cancellationToken);
        if (user is null)
        {
            return ResetPasswordWithTokenResult.InvalidOrExpiredToken();
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, command.NewPassword);
        resetToken.UsedAtUtc = DateTime.UtcNow;

        // Same reasoning a compromised-account password change anywhere
        // else in this codebase follows: whoever is resetting the password
        // might be recovering the account FROM an attacker, so every
        // existing session gets logged out rather than just this one.
        await _userRepository.RevokeAllRefreshTokensForUserAsync(user.Id, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return ResetPasswordWithTokenResult.Ok();
    }
}
