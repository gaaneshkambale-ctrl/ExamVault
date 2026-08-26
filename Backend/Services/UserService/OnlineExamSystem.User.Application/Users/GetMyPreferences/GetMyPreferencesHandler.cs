using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.GetMyPreferences;

public class GetMyPreferencesHandler
{
    private readonly IUserRepository _userRepository;

    public GetMyPreferencesHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public Task<UserPreferences> HandleAsync(GetMyPreferencesQuery query, CancellationToken cancellationToken = default) =>
        _userRepository.GetOrCreateUserPreferencesAsync(query.UserId, cancellationToken);
}
