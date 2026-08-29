using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.Create;

public class CreateUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<CreateUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IPasswordGenerator _passwordGenerator;
    private readonly IEmailDispatcher _emailDispatcher;
    private readonly ITenantUrlBuilder _tenantUrlBuilder;
    private readonly ILogger<CreateUserHandler> _logger;

    public CreateUserHandler(
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IValidator<CreateUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IPasswordGenerator passwordGenerator,
        IEmailDispatcher emailDispatcher,
        ITenantUrlBuilder tenantUrlBuilder,
        ILogger<CreateUserHandler> logger)
    {
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _passwordGenerator = passwordGenerator;
        _emailDispatcher = emailDispatcher;
        _tenantUrlBuilder = tenantUrlBuilder;
        _logger = logger;
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

        var existingUser = await _userRepository.GetByEmailAsync(command.Email, command.TenantId, cancellationToken);
        if (existingUser is not null)
        {
            return CreateUserResult.Conflict();
        }

        var temporaryPassword = _passwordGenerator.Generate();

        var user = new AppUser
        {
            TenantId = command.TenantId,
            FullName = command.FullName,
            Email = command.Email,
            Role = Enum.Parse<UserRole>(command.Role, ignoreCase: true),
            // Always starts Inactive - ChangePasswordHandler activates it
            // automatically on this user's own forced first password
            // change, same policy as new organizations.
            IsActive = false,
            PhoneNumber = string.IsNullOrWhiteSpace(command.PhoneNumber) ? null : command.PhoneNumber.Trim(),
            RollNumber = string.IsNullOrWhiteSpace(command.RollNumber) ? null : command.RollNumber.Trim(),
            MustChangePassword = true,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, temporaryPassword);

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        var loginUrl = _tenantUrlBuilder.GetLoginUrl(tenant?.Slug, tenant?.IsActive ?? true);
        var orgName = tenant?.Name;

        var emailSent = await _emailDispatcher.SendAsync(
            toEmail: user.Email,
            toName: user.FullName,
            subject: orgName != null ? $"Your ExamVault account for {orgName}" : "Your ExamVault account",
            // No leading "Hello {name}," here - the n8n email template
            // already renders its own greeting from toName.
            body: (orgName != null ? $"An ExamVault account has been created for you at {orgName}.\n\n" : "An ExamVault account has been created for you.\n\n") +
                  $"Login URL: {loginUrl}\n" +
                  $"Email: {user.Email}\n" +
                  $"Temporary password: {temporaryPassword}\n\n" +
                  "Please log in with this temporary password - you will be asked to " +
                  "set a new password of your own before you can continue.\n\n" +
                  "Thanks & Regards,\nExamVault",
            loginUrl: loginUrl,
            tenantSlug: tenant?.Slug,
            cancellationToken: cancellationToken);
        if (!emailSent)
        {
            // Account creation must not fail just because the invite email
            // didn't go out - same "email is a best-effort side channel"
            // principle the Notification service already follows. The
            // Admin still sees the account in the user list either way.
            _logger.LogWarning("Invite email failed to send for newly created user {UserId}.", user.Id);
        }

        return CreateUserResult.Ok(user);
    }
}
