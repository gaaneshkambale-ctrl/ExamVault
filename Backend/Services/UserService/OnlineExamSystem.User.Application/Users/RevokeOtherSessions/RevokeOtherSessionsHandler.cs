using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.RevokeOtherSessions;

public class RevokeOtherSessionsHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenService _jwtTokenService;

    public RevokeOtherSessionsHandler(IUserRepository userRepository, IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _jwtTokenService = jwtTokenService;
    }

    public Task HandleAsync(RevokeOtherSessionsCommand command, CancellationToken cancellationToken = default)
    {
        var currentHash = _jwtTokenService.HashToken(command.CurrentRefreshToken);
        return _userRepository.RevokeOtherRefreshTokensForUserAsync(command.UserId, currentHash, cancellationToken);
    }
}
