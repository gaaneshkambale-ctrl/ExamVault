using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Login;

public class LoginUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<LoginUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public LoginUserHandler(
        IUserRepository userRepository,
        IValidator<LoginUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
    }

    public async Task<LoginUserResult> HandleAsync(
        LoginUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return LoginUserResult.InvalidCredentials();
        }

        var user = await _userRepository.GetByEmailAsync(command.Email, cancellationToken);
        if (user is null)
        {
            return LoginUserResult.InvalidCredentials();
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return LoginUserResult.InvalidCredentials();
        }

        return LoginUserResult.Ok(user);
    }
}
