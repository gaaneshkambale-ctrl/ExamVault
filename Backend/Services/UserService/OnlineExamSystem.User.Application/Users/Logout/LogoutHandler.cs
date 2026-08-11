using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.Logout;

public class LogoutHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenService _jwtTokenService;

    public LogoutHandler(IUserRepository userRepository, IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _jwtTokenService = jwtTokenService;
    }

    public async Task HandleAsync(LogoutCommand command, CancellationToken cancellationToken = default)
    {
        var tokenHash = _jwtTokenService.HashToken(command.RefreshToken);
        var storedToken = await _userRepository.GetRefreshTokenByHashAsync(tokenHash, cancellationToken);
        if (storedToken is null || storedToken.RevokedAtUtc is not null)
        {
            return;
        }

        storedToken.RevokedAtUtc = DateTime.UtcNow;
        await _userRepository.SaveChangesAsync(cancellationToken);
    }
}
