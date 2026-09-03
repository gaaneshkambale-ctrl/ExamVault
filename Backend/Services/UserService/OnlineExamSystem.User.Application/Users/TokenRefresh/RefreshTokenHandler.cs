using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Common;
using OnlineExamSystem.User.Application.Users.RolePermissions;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.TokenRefresh;

public class RefreshTokenHandler
{
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

        storedToken.RevokedAtUtc = DateTime.UtcNow;

        // Re-resolved fresh on every refresh (not carried over from the old
        // token) - this is how a Plan/feature change actually reaches an
        // already-logged-in Admin, within one refresh cycle rather than
        // requiring a fresh login.
        var enabledFeatures = await _planRepository.GetFeaturesForTenantAsync(user.TenantId, cancellationToken);
        var grantedPermissions = await _rolePermissionRepository.GetForRoleAsync(
            user.TenantId, RolePermissionCatalog.CatalogRoleName(user.Role), cancellationToken);
        var tenant = await _tenantRepository.GetByIdAsync(user.TenantId, cancellationToken);
        var platformSettings = await _platformSettingsRepository.GetAsync(cancellationToken);
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
        }, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return RefreshTokenResult.Ok(newAccessToken, newRefreshToken);
    }
}
