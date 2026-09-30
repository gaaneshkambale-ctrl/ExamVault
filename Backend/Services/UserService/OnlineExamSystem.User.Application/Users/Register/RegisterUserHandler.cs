using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
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
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailDispatcher _emailDispatcher;
    private readonly ITenantUrlBuilder _tenantUrlBuilder;
    private readonly ILogger<RegisterUserHandler> _logger;

    private static readonly TimeSpan ConfirmationTokenLifetime = TimeSpan.FromHours(24);

    public RegisterUserHandler(
        IUserRepository userRepository,
        IValidator<RegisterUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IEventPublisher eventPublisher,
        IPlatformSettingsRepository platformSettingsRepository,
        IJwtTokenService jwtTokenService,
        IEmailDispatcher emailDispatcher,
        ITenantUrlBuilder tenantUrlBuilder,
        ILogger<RegisterUserHandler> logger)
    {
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _eventPublisher = eventPublisher;
        _platformSettingsRepository = platformSettingsRepository;
        _jwtTokenService = jwtTokenService;
        _emailDispatcher = emailDispatcher;
        _tenantUrlBuilder = tenantUrlBuilder;
        _logger = logger;
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

        // Platform Settings > "Require Email Verification" (no settings row
        // yet = on, the entity default).
        var requireEmailVerification = platformSettings?.RequireEmailVerification ?? true;

        var user = new AppUser
        {
            TenantId = TenantConstants.DefaultTenantId,
            FullName = command.FullName,
            Email = command.Email,
            // Nobody vetted this email by typing it in themselves (unlike
            // CreateUserHandler/CreateTenantAdminHandler, where an Admin
            // did) - login stays blocked (see LoginUserHandler) until the
            // ConfirmEmail link below is used. With verification off the
            // account starts confirmed, so turning the setting back on
            // later never retroactively locks out someone who registered
            // while it was off.
            EmailConfirmed = !requireEmailVerification,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, command.Password);

        await _userRepository.AddAsync(user, cancellationToken);
        try
        {
            await _userRepository.SaveChangesAsync(cancellationToken);
        }
        catch (DuplicateKeyException)
        {
            // The existingUser check above isn't inside a transaction - two
            // concurrent registrations for the same email (e.g. a double-
            // submitted form) can both pass it before either commits. The
            // loser lands here instead of surfacing as an unhandled 500.
            return RegisterUserResult.Conflict();
        }

        await _eventPublisher.PublishAsync(
            new UserRegisteredEvent { TenantId = user.TenantId, UserId = user.Id, Email = user.Email, FullName = user.FullName },
            cancellationToken);

        if (!requireEmailVerification)
        {
            return RegisterUserResult.Ok(user);
        }

        // Same token-issuing shape ForgotPasswordHandler uses for its own
        // reset link (and ResendConfirmationEmailHandler reuses for a
        // second attempt if this one expires unused).
        var rawToken = _jwtTokenService.GenerateRefreshToken();
        await _userRepository.AddEmailConfirmationTokenAsync(new EmailConfirmationToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(rawToken),
            ExpiresAtUtc = DateTime.UtcNow.Add(ConfirmationTokenLifetime),
        }, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        // Self-registration has no tenant subdomain (see the comment above
        // on TenantId) so this always resolves to the apex URL, same as
        // ForgotPasswordHandler's Default-tenant case.
        var confirmUrl = _tenantUrlBuilder.GetConfirmEmailUrl(tenantSlug: null, isActive: true, rawToken);
        var emailSent = await _emailDispatcher.SendAsync(
            toEmail: user.Email,
            toName: user.FullName,
            subject: "Confirm your ExamVault account",
            // No leading "Hello {name}," here - the n8n email template
            // already renders its own greeting from toName, same convention
            // every other transactional email in this codebase follows.
            body: "Thanks for registering with ExamVault - one more step before you can log in.\n\n" +
                  $"Confirm your email: {confirmUrl}\n\n" +
                  "This link expires in 24 hours and can only be used once. " +
                  "If you didn't create this account, you can safely ignore this email.\n\n" +
                  "Thanks & Regards,\nExamVault",
            loginUrl: confirmUrl,
            tenantSlug: null,
            cancellationToken: cancellationToken);
        if (!emailSent)
        {
            _logger.LogWarning("Confirmation email failed to send for newly registered user {UserId}.", user.Id);
        }

        return RegisterUserResult.Ok(user);
    }
}
