using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Common;
using OnlineExamSystem.User.Application.Users.RolePermissions;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.Login;

public class LoginUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;
    private readonly IPlatformSettingsRepository _platformSettingsRepository;
    private readonly IValidator<LoginUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IAuditClient _auditClient;

    public LoginUserHandler(
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IPlanRepository planRepository,
        IRolePermissionRepository rolePermissionRepository,
        IPlatformSettingsRepository platformSettingsRepository,
        IValidator<LoginUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IJwtTokenService jwtTokenService,
        IAuditClient auditClient)
    {
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _planRepository = planRepository;
        _rolePermissionRepository = rolePermissionRepository;
        _platformSettingsRepository = platformSettingsRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _auditClient = auditClient;
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

        // Read-only - never creates a row on the hot login path. Null means
        // "no admin has touched Settings yet", so every real field below falls
        // back to the same default the pre-Settings code always used.
        var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);

        // TenantSlug is only ever populated once the Gateway/frontend actually
        // resolves a subdomain (Phase 3 of multi_tenant_saas.txt) - until then
        // (local dev, today's single-tenant Azure setup) this stays null and
        // login falls into the bare-domain path below. An unknown/inactive
        // slug returns the same "invalid credentials" the caller would get
        // for a wrong password - it must never reveal whether a tenant slug
        // exists.
        Guid? tenantId = null;
        AppUser? user;
        if (!string.IsNullOrWhiteSpace(command.TenantSlug))
        {
            var tenant = await _tenantRepository.GetBySlugAsync(command.TenantSlug, cancellationToken);
            if (tenant is null || !tenant.IsActive)
            {
                return LoginUserResult.InvalidCredentials();
            }

            tenantId = tenant.Id;
            user = await _userRepository.GetByEmailAsync(command.Email, tenantId, cancellationToken);
        }
        else
        {
            user = await ResolveBareDomainUserAsync(command.Email, cancellationToken);
        }

        if (user is null)
        {
            return LoginUserResult.InvalidCredentials();
        }

        // Real Security Settings > Password Policy "Maximum Login Attempts" -
        // checked before touching the password at all, so a locked-out account
        // can't be brute-forced during its own lockout window. Expired lockouts
        // clear themselves here rather than needing a separate cleanup job.
        if (user.LockoutEndUtc is not null)
        {
            if (user.LockoutEndUtc > DateTime.UtcNow)
            {
                return LoginUserResult.AccountLocked(user.LockoutEndUtc.Value);
            }

            user.LockoutEndUtc = null;
            user.FailedLoginAttempts = 0;
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            var maxAttempts = platformSettings?.MaxLoginAttempts ?? 5;
            var lockoutMinutes = platformSettings?.LockoutMinutes ?? 15;
            user.FailedLoginAttempts += 1;
            var justLockedOut = user.FailedLoginAttempts >= maxAttempts;
            if (justLockedOut)
            {
                user.LockoutEndUtc = DateTime.UtcNow.AddMinutes(lockoutMinutes);
            }
            await _userRepository.SaveChangesAsync(cancellationToken);

            // Only auditable failure case with a real identity to attach -
            // unknown tenant/email above deliberately stays unaudited too,
            // same "never reveal whether it exists" principle already
            // documented there.
            await RecordLoginAuditAsync(user, "Failed login", command.IpAddress, cancellationToken);
            if (justLockedOut)
            {
                // Distinct from "Failed login" so lockout is its own
                // filterable event instead of only being inferable by
                // counting consecutive failures.
                await RecordLoginAuditAsync(user, "Account locked", command.IpAddress, cancellationToken);
                return LoginUserResult.AccountLocked(user.LockoutEndUtc!.Value);
            }
            return LoginUserResult.InvalidCredentials();
        }

        if (!user.IsActive && !user.MustChangePassword)
        {
            await RecordLoginAuditAsync(user, "Failed login", command.IpAddress, cancellationToken);
            return LoginUserResult.AccountDeactivated();
        }

        // Self-registration only (RegisterUserHandler) - every other
        // creation path (CreateUserHandler, CreateTenantAdminHandler, the
        // bootstrap Super Admin) starts EmailConfirmed=true, since a human
        // Admin already vetted that email. Checked after the correct
        // password, same as IsActive above, so a wrong-password attempt
        // against an unconfirmed account still looks like an ordinary
        // failed login rather than confirming the account exists.
        if (!user.EmailConfirmed)
        {
            await RecordLoginAuditAsync(user, "Failed login", command.IpAddress, cancellationToken);
            return LoginUserResult.EmailNotConfirmed();
        }

        // Real Platform Settings > General "Allow Self Registration" - a
        // Super Admin turning this off is a deliberate decision to shut the
        // self-service signup door; extending that to also lock out
        // everyone who already walked through it (every Default-tenant
        // account, since RegisterUserHandler is the only path that creates
        // one) is what a Super Admin reasonably expects "off" to mean, not
        // just "no new signups from here on". Regular tenant/org accounts
        // (CreateUserHandler, CreateTenantAdminHandler) are never affected -
        // this setting only ever governed the public self-registration
        // door, not org-provisioned users. Checked after the correct
        // password/EmailConfirmed, same reasoning as MaintenanceMode below -
        // a wrong-password attempt against a disabled self-registered
        // account still looks like an ordinary failed login. Role check is
        // defensive (TenantConstants.DefaultTenantId is never assigned to a
        // SuperAdmin in practice) but mirrors MaintenanceMode's own
        // SuperAdmin bypass rather than assuming that invariant holds.
        if (platformSettings is not null && !platformSettings.AllowSelfRegistration
            && user.TenantId == TenantConstants.DefaultTenantId && user.Role != UserRole.SuperAdmin)
        {
            await RecordLoginAuditAsync(user, "Failed login", command.IpAddress, cancellationToken);
            return LoginUserResult.SelfRegistrationDisabled();
        }

        // Real Platform Settings > General "Maintenance Mode" - checked only
        // after a genuinely correct password, so a wrong-password attempt
        // during maintenance still looks like an ordinary failed login, not a
        // maintenance-mode probe. Super Admin always gets through, so they can
        // turn it back off.
        if (platformSettings is not null && platformSettings.MaintenanceModeEnabled && user.Role != UserRole.SuperAdmin)
        {
            return LoginUserResult.MaintenanceMode();
        }

        var enabledFeatures = await _planRepository.GetFeaturesForTenantAsync(user.TenantId, cancellationToken);
        var grantedPermissions = await _rolePermissionRepository.GetForRoleAsync(
            user.TenantId, RolePermissionCatalog.CatalogRoleName(user.Role), cancellationToken);
        var callerTenant = await _tenantRepository.GetByIdAsync(user.TenantId, cancellationToken);
        var accessToken = _jwtTokenService.GenerateAccessToken(
            user, enabledFeatures, grantedPermissions, callerTenant?.PermissionVersion ?? 0, platformSettings?.SessionTimeoutMinutes);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        await _userRepository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(refreshToken),
            ExpiresAtUtc = _jwtTokenService.GetRefreshTokenExpiry(),
            DeviceLabel = UserAgentDeviceParser.Describe(command.UserAgent),
            IpAddress = command.IpAddress,
        }, cancellationToken);
        user.LastLoginAtUtc = DateTime.UtcNow;
        user.FailedLoginAttempts = 0;
        user.LockoutEndUtc = null;
        await _userRepository.SaveChangesAsync(cancellationToken);

        await RecordLoginAuditAsync(user, "User login", command.IpAddress, cancellationToken);
        return LoginUserResult.Ok(user, accessToken, refreshToken);
    }

    // Bare-domain login (no subdomain) is reserved for the Super Admin's
    // own platform-level account, with two deliberate exceptions:
    // 1. A brand-new tenant's first admin is emailed a bare-domain login
    //    URL (TenantUrlBuilder.GetLoginUrl) while their tenant is still
    //    IsActive=false, before its subdomain is usable at all (Gateway
    //    404s an inactive tenant's subdomain) - the same condition must be
    //    honored here, or that first login (which is what activates the
    //    tenant) can never happen.
    // 2. Every self-registered user (RegisterUserHandler) lands in the
    //    Default tenant, which TenantUrlBuilder deliberately never gives a
    //    subdomain URL to (same "Default"/"Platform" exclusion
    //    ConfirmEmailUrl/ResetPasswordUrl/LoginUrl all share) - it's always
    //    IsActive=true, so without this exception every self-registered
    //    user would be rejected on every login attempt, forever.
    //
    // Email uniqueness is only enforced PER TENANT (see
    // IUserRepository.GetByEmailAsync's own comment) - the same real person
    // can legitimately hold a Student account at one org AND a Super
    // Admin/self-registered Default-tenant account at the same time. A
    // plain single-result email lookup can't tell those apart and may
    // return the wrong one (confirmed live: exactly this happened to a
    // real user - their org Student account was matched instead of their
    // own Default-tenant self-registration, permanently blocking their
    // bare-domain login with no way to ever succeed). So this fetches
    // every account sharing the email and picks the one actually eligible
    // under the rules above, rather than trusting lookup order.
    private async Task<AppUser?> ResolveBareDomainUserAsync(string email, CancellationToken cancellationToken)
    {
        var candidates = await _userRepository.GetAllByEmailAsync(email, cancellationToken);
        if (candidates.Count == 0)
        {
            return null;
        }

        var superAdmin = candidates.FirstOrDefault(u => u.Role == UserRole.SuperAdmin);
        if (superAdmin is not null)
        {
            return superAdmin;
        }

        var defaultTenantUser = candidates.FirstOrDefault(u => u.TenantId == TenantConstants.DefaultTenantId);
        if (defaultTenantUser is not null)
        {
            return defaultTenantUser;
        }

        foreach (var candidate in candidates)
        {
            var candidateTenant = await _tenantRepository.GetByIdAsync(candidate.TenantId, cancellationToken);
            if (candidateTenant is not null && !candidateTenant.IsActive)
            {
                return candidate;
            }
        }

        // No candidate is eligible for bare-domain access - same generic
        // "invalid credentials" the caller gets for a wrong password or an
        // unknown email, to avoid revealing that an account exists at all.
        return null;
    }

    // Moved here from UsersController.Login (which only ever had the
    // success case) - only the handler has a resolved `user` at the exact
    // point a wrong password or a deactivated account gets rejected, which
    // is what makes Failed Login Attempts auditable at all.
    private Task RecordLoginAuditAsync(
        AppUser user,
        string activity,
        string? ipAddress,
        CancellationToken cancellationToken) =>
        _auditClient.RecordAsync(
            user.TenantId,
            "Auth",
            activity,
            null,
            null,
            user.Id,
            user.FullName,
            ipAddress,
            cancellationToken: cancellationToken);
}
