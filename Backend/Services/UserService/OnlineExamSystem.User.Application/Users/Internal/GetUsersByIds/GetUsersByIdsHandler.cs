using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Internal.GetUsersByIds;

public class GetUsersByIdsHandler
{
    private readonly IUserRepository _userRepository;

    public GetUsersByIdsHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<IReadOnlyList<AppUser>> HandleAsync(
        GetUsersByIdsQuery query,
        CancellationToken cancellationToken = default) =>
        _userRepository.GetByIdsAsync(query.UserIds, cancellationToken);
}
