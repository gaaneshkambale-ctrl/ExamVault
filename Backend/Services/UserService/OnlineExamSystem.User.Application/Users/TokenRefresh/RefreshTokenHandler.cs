using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Common;
using OnlineExamSystem.User.Application.Users.RolePermissions;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Application.Users.TokenRefresh;

public class RefreshTokenHandler
{
    // Absolute session lifetime: every refresh extends the refresh token's
    // own expiry, so without this cap a session used at least weekly would
    // never end.
    public static readonly TimeSpan MaxSessionAge = TimeSpan.FromDays(30);

    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IRolePermissionRepository _rolePermissionRepository;
    private readonly IPlatformSettingsRepository _platformSettingsRepository;
    private readonly IJwtTokenService _jwtTokenService;

    public RefreshTokenHandler(
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IPlanRepository planRepository,
        IRolePermissionRepository rolePermissionRepository,
        IPlatformSettingsRepository platformSettingsRepository,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _planRepository = planRepository;
        _rolePermissionRepository = rolePermissionRepository;
        _platformSettingsRepository = platformSettingsRepository;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<RefreshTokenResult> HandleAsync(
        RefreshTokenCommand command,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = _jwtTokenService.HashToken(command.RefreshToken);
        var storedToken = await _userRepository.GetRefreshTokenByHashAsync(tokenHash, cancellationToken);
        if (storedToken is null || !storedToken.IsActive)
        {
            return RefreshTokenResult.Invalid();
        }

        var user = await _userRepository.GetByIdAsync(storedToken.UserId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return RefreshTokenResult.Invalid();
        }

        if (DateTime.UtcNow - storedToken.SessionStartedAtUtc > MaxSessionAge)
        {
            return RefreshTokenResult.Invalid();
        }

        // Login refuses a deactivated organization, but a refresh previously
        // didn't - so a suspended org (manual deactivation or TrialExpiryCheck-
        // Service) kept working for as long as its users stayed active. Checked
        // here rather than revoking tokens at deactivation time so it covers
        // every deactivation path, and reactivating the org lets sessions
        // resume. Same exceptions as login: Super Admin, and a new org's admin
        // still completing the forced first password change (the org only
        // becomes active once they do - see ChangePasswordHandler).
        var tenant = await _tenantRepository.GetByIdAsync(user.TenantId, cancellationToken);
        if (user.Role != UserRole.SuperAdmin && !user.MustChangePassword && (tenant is null || !tenant.IsActive))
        {
            return RefreshTokenResult.Invalid();
        }

        // Fetched here (not further down where it was previously only
        // needed for SessionTimeoutMinutes) so the AllowSelfRegistration
        // check below can run before this refresh is allowed to succeed.
        var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);

        // Same check LoginUserHandler makes for a brand-new login (see its
        // own comment) - without this, an already-logged-in self-registered
        // user would keep silently refreshing their session forever after a
        // Super Admin turns self-registration off, since a refresh only
        // fetches a NEW access token from an existing valid refresh token
        // rather than re-running the full login flow. Confirmed live: this
        // is exactly what let a real self-registered session stay logged
        // in through both settings states before this check existed. Not
        // revoking the stored refresh token here (same as the IsActive
        // check above) - if self-registration is turned back on later, the
        // same token should work again without forcing a fresh login.
        if (platformSettings is not null && !platformSettings.AllowSelfRegistration
            && user.TenantId == TenantConstants.DefaultTenantId && user.Role != UserRole.SuperAdmin)
        {
            return RefreshTokenResult.Invalid();
        }

        // Maintenance Mode was login-only, so already-signed-in users carried
        // on; now they drop within one access-token lifetime. Not revoking -
        // the same session works again once maintenance ends.
        if (platformSettings is not null && platformSettings.MaintenanceModeEnabled && user.Role != UserRole.SuperAdmin)
        {
            return RefreshTokenResult.Invalid();
        }

        storedToken.RevokedAtUtc = DateTime.UtcNow;

        // Re-resolved fresh on every refresh (not carried over from the old
        // token) - this is how a Plan/feature change actually reaches an
        // already-logged-in Admin, within one refresh cycle rather than
        // requiring a fresh login.
        var enabledFeatures = await _planRepository.GetFeaturesForTenantAsync(user.TenantId, cancellationToken);
        var grantedPermissions = await _rolePermissionRepository.GetForRoleAsync(
            user.TenantId, RolePermissionCatalog.CatalogRoleName(user.Role), cancellationToken);
        var newAccessToken = _jwtTokenService.GenerateAccessToken(
            user, enabledFeatures, grantedPermissions, tenant?.PermissionVersion ?? 0, platformSettings?.SessionTimeoutMinutes);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

        await _userRepository.AddRefreshTokenAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(newRefreshToken),
            ExpiresAtUtc = _jwtTokenService.GetRefreshTokenExpiry(),
            DeviceLabel = UserAgentDeviceParser.Describe(command.UserAgent),
            IpAddress = command.IpAddress,
            SessionStartedAtUtc = storedToken.SessionStartedAtUtc,
        }, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return RefreshTokenResult.Ok(newAccessToken, newRefreshToken);
    }
}
