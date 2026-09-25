using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.ChangePassword;

public class ChangePasswordHandler
{
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<ChangePasswordCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public ChangePasswordHandler(
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IValidator<ChangePasswordCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
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
        user.IsActive = true;

        // A new org starts Inactive (CreateTenantHandler) until its admin
        // completes this exact forced first password change - this is that
        // activation trigger. ITenantRepository/IUserRepository share the
        // same scoped UserDbContext, so the save below persists both.
        if (user.Role == UserRole.Admin)
        {
            var tenant = await _tenantRepository.GetByIdAsync(user.TenantId, cancellationToken);
            if (tenant is not null && !tenant.IsActive)
            {
                tenant.IsActive = true;
            }
        }

        await _userRepository.SaveChangesAsync(cancellationToken);

        // A password change should lock out anyone else holding a session
        // (eg. a stolen one) - keep only the caller's own session when the
        // client identifies it, otherwise end them all.
        if (string.IsNullOrWhiteSpace(command.CurrentRefreshToken))
        {
            await _userRepository.RevokeAllRefreshTokensForUserAsync(user.Id, cancellationToken);
        }
        else
        {
            await _userRepository.RevokeOtherRefreshTokensForUserAsync(
                user.Id, _jwtTokenService.HashToken(command.CurrentRefreshToken), cancellationToken);
        }

        return ChangePasswordResult.Ok();
    }
}
