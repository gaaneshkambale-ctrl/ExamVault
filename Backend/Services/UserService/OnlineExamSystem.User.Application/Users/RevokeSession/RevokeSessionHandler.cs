using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.RevokeSession;

public class RevokeSessionHandler
{
    private readonly IUserRepository _userRepository;

    public RevokeSessionHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<bool> HandleAsync(RevokeSessionCommand command, CancellationToken cancellationToken = default) =>
        _userRepository.RevokeRefreshTokenByIdAsync(command.UserId, command.SessionId, cancellationToken);
}
