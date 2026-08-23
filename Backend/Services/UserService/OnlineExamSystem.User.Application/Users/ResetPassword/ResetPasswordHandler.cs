using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.ResetPassword;

public class ResetPasswordHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<ResetPasswordCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;

    public ResetPasswordHandler(
        IUserRepository userRepository,
        IValidator<ResetPasswordCommand> validator,
        IPasswordHasher<AppUser> passwordHasher)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
    }

    public async Task<ResetPasswordResult> HandleAsync(
        ResetPasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return ResetPasswordResult.Invalid(errors);
        }

        var user = await _userRepository.GetByIdForTenantAsync(command.UserId, cancellationToken);
        if (user is null)
        {
            return ResetPasswordResult.NotFound();
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, command.NewPassword);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return ResetPasswordResult.Ok();
    }
}
