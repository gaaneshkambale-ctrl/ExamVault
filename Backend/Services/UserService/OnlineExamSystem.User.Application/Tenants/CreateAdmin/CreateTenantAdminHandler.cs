using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Tenants.CreateAdmin;

// The "manual provisioning" path for onboarding a new tenant (Phase 1 scope
// note: no self-service signup yet) - a Super Admin calls this once, right
// after creating the tenant itself, to give it its first real Admin.
public class CreateTenantAdminHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IValidator<CreateTenantAdminCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IPasswordGenerator _passwordGenerator;
    private readonly IEmailDispatcher _emailDispatcher;
    private readonly ITenantUrlBuilder _tenantUrlBuilder;
    private readonly ILogger<CreateTenantAdminHandler> _logger;

    public CreateTenantAdminHandler(
        ITenantRepository tenantRepository,
        IUserRepository userRepository,
        IValidator<CreateTenantAdminCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IPasswordGenerator passwordGenerator,
        IEmailDispatcher emailDispatcher,
        ITenantUrlBuilder tenantUrlBuilder,
        ILogger<CreateTenantAdminHandler> logger)
    {
        _tenantRepository = tenantRepository;
        _userRepository = userRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _passwordGenerator = passwordGenerator;
        _emailDispatcher = emailDispatcher;
        _tenantUrlBuilder = tenantUrlBuilder;
        _logger = logger;
    }

    public async Task<CreateTenantAdminResult> HandleAsync(
        CreateTenantAdminCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return CreateTenantAdminResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return CreateTenantAdminResult.NotFound();
        }

        var existingUser = await _userRepository.GetByEmailAsync(command.Email, command.TenantId, cancellationToken);
        if (existingUser is not null)
        {
            return CreateTenantAdminResult.Conflict();
        }

        var temporaryPassword = _passwordGenerator.Generate();

        var user = new AppUser
        {
            TenantId = command.TenantId,
            FullName = command.FullName,
            Email = command.Email,
            Role = UserRole.Admin,
            IsActive = true,
            MustChangePassword = true,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, temporaryPassword);

        await _userRepository.AddAsync(user, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        var loginUrl = _tenantUrlBuilder.GetLoginUrl(tenant.Slug);

        var emailSent = await _emailDispatcher.SendAsync(
            toEmail: user.Email,
            toName: user.FullName,
            subject: $"Your ExamVault admin account for {tenant.Name}",
            body: $"Hello {user.FullName},\n\n" +
                  $"An ExamVault Admin account has been created for you at {tenant.Name}.\n\n" +
                  $"Login URL: {loginUrl}\n" +
                  $"Email: {user.Email}\n" +
                  $"Temporary password: {temporaryPassword}\n\n" +
                  "Please log in with this temporary password - you will be asked to " +
                  "set a new password of your own before you can continue.\n\n" +
                  "Thanks & Regards,\nExamVault",
            loginUrl: loginUrl,
            tenantSlug: tenant.Slug,
            cancellationToken: cancellationToken);
        if (!emailSent)
        {
            _logger.LogWarning("Invite email failed to send for new tenant admin {UserId}.", user.Id);
        }

        return CreateTenantAdminResult.Ok(user);
    }
}
