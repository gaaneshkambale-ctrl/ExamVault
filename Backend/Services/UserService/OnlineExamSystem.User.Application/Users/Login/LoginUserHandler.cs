using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Common;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Login;

public class LoginUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<LoginUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public LoginUserHandler(
        IUserRepository userRepository,
        IValidator<LoginUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginUserResult> HandleAsync(
        LoginUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return LoginUserResult.InvalidCredentials();
        }

        // No subdomain resolution yet (Phase 3) - tenant isn't known before
        // login, so this matches by email alone across all tenants. Safe in
        // practice today (one self-signup tenant, plus manually-provisioned
        // ones with distinct admin emails) but is a known gap the Phase 3
        // subdomain-scoped lookup closes for good.
        var user = await _userRepository.GetByEmailAsync(command.Email, tenantId: null, cancellationToken);
        if (user is null)
        {
            return LoginUserResult.InvalidCredentials();
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return LoginUserResult.InvalidCredentials();
        }

        if (!user.IsActive && !user.MustChangePassword)
        {
            return LoginUserResult.AccountDeactivated();
        }

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        await _userRepository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(refreshToken),
            ExpiresAtUtc = _jwtTokenService.GetRefreshTokenExpiry(),
            DeviceLabel = UserAgentDeviceParser.Describe(command.UserAgent),
            IpAddress = command.IpAddress,
        }, cancellationToken);
        user.LastLoginAtUtc = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);

        return LoginUserResult.Ok(user, accessToken, refreshToken);
    }
}
