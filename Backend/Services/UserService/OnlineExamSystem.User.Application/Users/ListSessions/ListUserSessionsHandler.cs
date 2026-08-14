using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.ListSessions;

public class ListUserSessionsHandler
{
    private readonly IUserRepository _userRepository;

    public ListUserSessionsHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<IReadOnlyList<RefreshToken>> HandleAsync(
        ListUserSessionsQuery query,
        CancellationToken cancellationToken = default) =>
        _userRepository.GetRefreshTokensByUserIdAsync(query.UserId, cancellationToken);
}
