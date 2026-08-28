using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Tenants.ResetAdminPassword;

// Super Admin support action: an org's admin is locked out and Super Admin
// resets it for them, the same way CreateTenantAdminHandler issues a first
// password - generate one, force a real change on next login, email it, and
// also hand it back in the response since email delivery here is best-effort
// (N8nEmailDispatcher's own contract) and the UI showing it directly is the
// reliable path.
public class ResetTenantAdminPasswordHandler
{
    private readonly ITenantRepository _tenantRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IPasswordGenerator _passwordGenerator;
    private readonly IEmailDispatcher _emailDispatcher;
    private readonly ITenantUrlBuilder _tenantUrlBuilder;
    private readonly ILogger<ResetTenantAdminPasswordHandler> _logger;

    public ResetTenantAdminPasswordHandler(
        ITenantRepository tenantRepository,
        IUserRepository userRepository,
        IPasswordHasher<AppUser> passwordHasher,
        IPasswordGenerator passwordGenerator,
        IEmailDispatcher emailDispatcher,
        ITenantUrlBuilder tenantUrlBuilder,
        ILogger<ResetTenantAdminPasswordHandler> logger)
    {
        _tenantRepository = tenantRepository;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _passwordGenerator = passwordGenerator;
        _emailDispatcher = emailDispatcher;
        _tenantUrlBuilder = tenantUrlBuilder;
        _logger = logger;
    }

    public async Task<ResetTenantAdminPasswordResult> HandleAsync(
        ResetTenantAdminPasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantRepository.GetByIdAsync(command.TenantId, cancellationToken);
        if (tenant is null)
        {
            return ResetTenantAdminPasswordResult.TenantMissing();
        }

        var user = await _userRepository.GetByIdForTenantAsync(command.AdminUserId, cancellationToken);
        if (user is null)
        {
            return ResetTenantAdminPasswordResult.UserMissing();
        }

        if (user.TenantId != command.TenantId || user.Role != UserRole.Admin)
        {
            return ResetTenantAdminPasswordResult.NotAdminOfTenant();
        }

        var temporaryPassword = _passwordGenerator.Generate();
        user.PasswordHash = _passwordHasher.HashPassword(user, temporaryPassword);
        user.MustChangePassword = true;
        await _userRepository.SaveChangesAsync(cancellationToken);

        var loginUrl = _tenantUrlBuilder.GetLoginUrl(tenant.Slug, tenant.IsActive);
        var emailSent = await _emailDispatcher.SendAsync(
            toEmail: user.Email,
            toName: user.FullName,
            subject: $"Your ExamVault admin password was reset for {tenant.Name}",
            body: $"Hello {user.FullName},\n\n" +
                  $"Your ExamVault Admin password for {tenant.Name} was reset by a platform administrator.\n\n" +
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
            _logger.LogWarning("Password reset email failed to send for tenant admin {UserId}.", user.Id);
        }

        return ResetTenantAdminPasswordResult.Ok(temporaryPassword);
    }
}
