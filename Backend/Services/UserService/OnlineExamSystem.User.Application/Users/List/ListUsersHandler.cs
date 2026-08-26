using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.List;

public class ListUsersHandler
{
    private readonly IUserRepository _userRepository;

    public ListUsersHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<IReadOnlyList<AppUser>> HandleAsync(
        ListUsersQuery query,
        CancellationToken cancellationToken = default) =>
        _userRepository.GetAllAsync(cancellationToken);
}
