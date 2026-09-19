using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.List;

public class ListStudentsHandler
{
    private readonly IUserRepository _userRepository;

    public ListStudentsHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<IReadOnlyList<AppUser>> HandleAsync(
        ListStudentsQuery query,
        CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);
        return users.Where(u => u.Role == UserRole.Student).ToList();
    }
}
