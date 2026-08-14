using FluentValidation;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.Update;

public class UpdateUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<UpdateUserCommand> _validator;

    public UpdateUserHandler(IUserRepository userRepository, IValidator<UpdateUserCommand> validator)
    {
        _userRepository = userRepository;
        _validator = validator;
    }

    public async Task<UpdateUserResult> HandleAsync(
        UpdateUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return UpdateUserResult.Invalid(errors);
        }

        var user = await _userRepository.GetByIdAsync(command.Id, cancellationToken);
        if (user is null)
        {
            return UpdateUserResult.NotFound();
        }

        var existingUser = await _userRepository.GetByEmailAsync(command.Email, cancellationToken);
        if (existingUser is not null && existingUser.Id != command.Id)
        {
            return UpdateUserResult.Conflict();
        }

        user.FullName = command.FullName;
        user.Email = command.Email;
        user.Role = Enum.Parse<UserRole>(command.Role, ignoreCase: true);
        user.PhoneNumber = string.IsNullOrWhiteSpace(command.PhoneNumber) ? null : command.PhoneNumber.Trim();

        await _userRepository.SaveChangesAsync(cancellationToken);

        return UpdateUserResult.Ok(user);
    }
}
