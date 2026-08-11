using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Register;

public class RegisterUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<RegisterUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public RegisterUserHandler(
        IUserRepository userRepository,
        IValidator<RegisterUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
    }

    public async Task<RegisterUserResult> HandleAsync(
        RegisterUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return RegisterUserResult.Invalid(errors);
        }

        var existingUser = await _userRepository.GetByEmailAsync(command.Email, cancellationToken);
        if (existingUser is not null)
        {
            return RegisterUserResult.Conflict();
        }

        var user = new AppUser
        {
            FullName = command.FullName,
            Email = command.Email,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, command.Password);

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return RegisterUserResult.Ok(user);
    }
}
