using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using GenderEnum = OnlineExamSystem.User.Domain.Enums.Gender;

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
        user.Username = string.IsNullOrWhiteSpace(command.Username) ? null : command.Username.Trim();
        user.AlternateEmail = string.IsNullOrWhiteSpace(command.AlternateEmail) ? null : command.AlternateEmail.Trim();
        user.Gender = string.IsNullOrWhiteSpace(command.Gender)
            ? null
            : Enum.Parse<GenderEnum>(command.Gender, ignoreCase: true);
        user.DateOfBirth = command.DateOfBirth;
        user.Location = string.IsNullOrWhiteSpace(command.Location) ? null : command.Location.Trim();
        user.Department = string.IsNullOrWhiteSpace(command.Department) ? null : command.Department.Trim();

        await _userRepository.SaveChangesAsync(cancellationToken);

        return UpdateMyProfileResult.Ok(user);
    }
}
