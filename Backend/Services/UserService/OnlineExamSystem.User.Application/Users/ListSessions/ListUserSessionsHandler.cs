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

    // GetRefreshTokensByUserIdAsync itself has no tenant check (it's a plain
    // userId lookup on RefreshTokens) - confirming the target user belongs to
    // the caller's own tenant (or the caller is Super Admin) first is what
    // stops an Admin listing another tenant's user's sessions (device
    // labels, IP addresses) just by knowing their id.
    public async Task<IReadOnlyList<RefreshToken>> HandleAsync(
        ListUserSessionsQuery query,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdForTenantAsync(query.UserId, cancellationToken);
        if (user is null)
        {
            return [];
        }

        return await _userRepository.GetRefreshTokensByUserIdAsync(query.UserId, cancellationToken);
    }
}
