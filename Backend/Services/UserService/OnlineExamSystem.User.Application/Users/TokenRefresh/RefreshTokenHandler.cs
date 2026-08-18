using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Common;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.TokenRefresh;

public class RefreshTokenHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenService _jwtTokenService;

    public RefreshTokenHandler(IUserRepository userRepository, IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<RefreshTokenResult> HandleAsync(
        RefreshTokenCommand command,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = _jwtTokenService.HashToken(command.RefreshToken);
        var storedToken = await _userRepository.GetRefreshTokenByHashAsync(tokenHash, cancellationToken);
        if (storedToken is null || !storedToken.IsActive)
        {
            return RefreshTokenResult.Invalid();
        }

        var user = await _userRepository.GetByIdAsync(storedToken.UserId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return RefreshTokenResult.Invalid();
        }

        storedToken.RevokedAtUtc = DateTime.UtcNow;

        var newAccessToken = _jwtTokenService.GenerateAccessToken(user);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

        await _userRepository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(newRefreshToken),
            ExpiresAtUtc = _jwtTokenService.GetRefreshTokenExpiry(),
            DeviceLabel = UserAgentDeviceParser.Describe(command.UserAgent),
        }, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return RefreshTokenResult.Ok(newAccessToken, newRefreshToken);
    }
}
