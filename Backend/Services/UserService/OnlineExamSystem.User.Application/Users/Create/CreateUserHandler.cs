using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.Create;

public class CreateUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<CreateUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public CreateUserHandler(
        IUserRepository userRepository,
        IValidator<CreateUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
    }

    public async Task<CreateUserResult> HandleAsync(
        CreateUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return CreateUserResult.Invalid(errors);
        }

        var existingUser = await _userRepository.GetByEmailAsync(command.Email, cancellationToken);
        if (existingUser is not null)
        {
            return CreateUserResult.Conflict();
        }

        var user = new AppUser
        {
            FullName = command.FullName,
            Email = command.Email,
            Role = Enum.Parse<UserRole>(command.Role, ignoreCase: true),
            IsActive = command.IsActive,
            PhoneNumber = string.IsNullOrWhiteSpace(command.PhoneNumber) ? null : command.PhoneNumber.Trim(),
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, command.Password);

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return CreateUserResult.Ok(user);
    }
}
