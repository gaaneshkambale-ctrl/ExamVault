using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.GetProfile;

public class GetUserProfileHandler
{
    private readonly IUserRepository _userRepository;

    public GetUserProfileHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<AppUser?> HandleAsync(GetUserProfileQuery query, CancellationToken cancellationToken = default) =>
        query.TenantScoped
            ? _userRepository.GetByIdForTenantAsync(query.UserId, cancellationToken)
            : _userRepository.GetByIdAsync(query.UserId, cancellationToken);
}
