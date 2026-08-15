using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.ChangePassword;

public class ChangePasswordHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<ChangePasswordCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public ChangePasswordHandler(
        IUserRepository userRepository,
        IValidator<ChangePasswordCommand> validator,
        IPasswordHasher<AppUser> passwordHasher)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
    }

    public async Task<ChangePasswordResult> HandleAsync(
        ChangePasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return ChangePasswordResult.Invalid(errors);
        }

        var user = await _userRepository.GetByIdAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return ChangePasswordResult.NotFound();
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.CurrentPassword);
        if (verification == PasswordVerificationResult.Failed)
        {
            return ChangePasswordResult.CurrentPasswordWrong();
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, command.NewPassword);
        user.MustChangePassword = false;
        await _userRepository.SaveChangesAsync(cancellationToken);

        return ChangePasswordResult.Ok();
    }
}
