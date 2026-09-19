using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.Shared.Events.Publishing;
using OnlineExamSystem.Shared.Events.User;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Register;

public class RegisterUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<RegisterUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IEventPublisher _eventPublisher;
    private readonly IPlatformSettingsRepository _platformSettingsRepository;

    public RegisterUserHandler(
        IUserRepository userRepository,
        IValidator<RegisterUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IEventPublisher eventPublisher,
        IPlatformSettingsRepository platformSettingsRepository)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _eventPublisher = eventPublisher;
        _platformSettingsRepository = platformSettingsRepository;
    }

    public async Task<RegisterUserResult> HandleAsync(
        RegisterUserCommand command,
        CancellationToken cancellationToken = default)
    {
        // Real Platform Settings > General > "Allow Self Registration" gate -
        // read-only lookup, no row created as a side effect of a blocked attempt.
        var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);
        if (platformSettings is not null && !platformSettings.AllowSelfRegistration)
        {
            return RegisterUserResult.Invalid(["Self-registration is currently disabled for this platform."]);
        }

        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return RegisterUserResult.Invalid(errors);
        }

        // Self-registration has no subdomain to resolve a tenant from yet
        // (Phase 3) - every self-signed-up Student lands in the seeded
        // Default tenant until that ships.
        var existingUser = await _userRepository.GetByEmailAsync(command.Email, TenantConstants.DefaultTenantId, cancellationToken);
        if (existingUser is not null)
        {
            return RegisterUserResult.Conflict();
        }

        var user = new AppUser
        {
            TenantId = TenantConstants.DefaultTenantId,
            FullName = command.FullName,
            Email = command.Email,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, command.Password);

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        await _eventPublisher.PublishAsync(
            new UserRegisteredEvent { TenantId = user.TenantId, UserId = user.Id, Email = user.Email, FullName = user.FullName },
            cancellationToken);

        return RegisterUserResult.Ok(user);
    }
}
