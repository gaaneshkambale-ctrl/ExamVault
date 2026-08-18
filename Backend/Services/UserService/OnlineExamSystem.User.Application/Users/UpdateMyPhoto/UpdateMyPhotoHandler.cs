using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.UpdateMyPhoto;

public class UpdateMyPhotoHandler
{
    private readonly IUserRepository _userRepository;

    public UpdateMyPhotoHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UpdateMyPhotoResult> HandleAsync(
        UpdateMyPhotoCommand command,
        CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return UpdateMyPhotoResult.NotFound();
        }

        user.PhotoData = command.PhotoData;
        user.PhotoContentType = command.ContentType;

        await _userRepository.SaveChangesAsync(cancellationToken);

        return UpdateMyPhotoResult.Ok();
    }
}
