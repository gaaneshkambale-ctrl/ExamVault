using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.UpdateMyProfile;

public class UpdateMyProfileHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<UpdateMyProfileCommand> _validator;

    public UpdateMyProfileHandler(IUserRepository userRepository, IValidator<UpdateMyProfileCommand> validator)
    {
        _userRepository = userRepository;
        _validator = validator;
    }

    public async Task<UpdateMyProfileResult> HandleAsync(
        UpdateMyProfileCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateMyProfileResult.Invalid(errors);
        }

        var user = await _userRepository.GetByIdAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return UpdateMyProfileResult.NotFound();
        }

        user.FullName = command.FullName;
        user.PhoneNumber = string.IsNullOrWhiteSpace(command.PhoneNumber) ? null : command.PhoneNumber.Trim();

        await _userRepository.SaveChangesAsync(cancellationToken);

        return UpdateMyProfileResult.Ok(user);
    }
}
