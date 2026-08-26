using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.Delete;

public class DeleteUserHandler
{
    private readonly IUserRepository _userRepository;

    public DeleteUserHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<DeleteUserResult> HandleAsync(
        DeleteUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdForTenantAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return DeleteUserResult.NotFound();
        }

        await _userRepository.RemoveAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return DeleteUserResult.Ok();
    }
}
