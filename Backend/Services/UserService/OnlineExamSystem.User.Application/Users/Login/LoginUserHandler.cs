using FluentValidation;
using Microsoft.AspNetCore.Identity;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.Common;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.Login;

public class LoginUserHandler
{
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IValidator<LoginUserCommand> _validator;
    private readonly IPasswordHasher<AppUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public LoginUserHandler(
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IPlanRepository planRepository,
        IValidator<LoginUserCommand> validator,
        IPasswordHasher<AppUser> passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _planRepository = planRepository;
        _validator = validator;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
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

        // TenantSlug is only ever populated once the Gateway/frontend actually
        // resolves a subdomain (Phase 3 of multi_tenant_saas.txt) - until then
        // (local dev, today's single-tenant Azure setup) this stays null and
        // the lookup matches by email alone across all tenants, same as
        // before. An unknown/inactive slug returns the same "invalid
        // credentials" the caller would get for a wrong password - it must
        // never reveal whether a tenant slug exists.
        Guid? tenantId = null;
        if (!string.IsNullOrWhiteSpace(command.TenantSlug))
        {
            var tenant = await _tenantRepository.GetBySlugAsync(command.TenantSlug, cancellationToken);
            if (tenant is null || !tenant.IsActive)
            {
                return LoginUserResult.InvalidCredentials();
            }

            tenantId = tenant.Id;
        }

        var user = await _userRepository.GetByEmailAsync(command.Email, tenantId, cancellationToken);
        if (user is null)
        {
            return LoginUserResult.InvalidCredentials();
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return LoginUserResult.InvalidCredentials();
        }

        if (!user.IsActive && !user.MustChangePassword)
        {
            return LoginUserResult.AccountDeactivated();
        }

        var enabledFeatures = await _planRepository.GetFeaturesForTenantAsync(user.TenantId, cancellationToken);
        var accessToken = _jwtTokenService.GenerateAccessToken(user, enabledFeatures);
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
        await _userRepository.SaveChangesAsync(cancellationToken);

        return LoginUserResult.Ok(user, accessToken, refreshToken);
    }
}
