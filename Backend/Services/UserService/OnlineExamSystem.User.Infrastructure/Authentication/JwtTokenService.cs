using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Infrastructure.Authentication;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public string GenerateAccessToken(AppUser user, IReadOnlyList<PlanFeature> enabledFeatures, IReadOnlyList<string> grantedPermissions)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(TenantClaimTypes.TenantId, user.TenantId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        // One claim per enabled Feature (not a single delimited value) - lets
        // every downstream service check `User.HasClaim(FeatureClaimTypes.Feature,
        // "Exams")` directly. Resolved by the caller from the user's Tenant's
        // current Plan - this class stays a pure token-crafter, no DB access.
        claims.AddRange(enabledFeatures.Distinct().Select(f => new Claim(FeatureClaimTypes.Feature, f.ToString())));

        // Same shape, different axis - one claim per granted RolePermission
        // key (Phase 1: only a couple of these are actually checked by any
        // policy yet, see PermissionPolicies).
        claims.AddRange(grantedPermissions.Distinct().Select(p => new Claim(PermissionClaimTypes.Permission, p)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    public DateTime GetRefreshTokenExpiry() => DateTime.UtcNow.AddDays(_settings.RefreshTokenDays);
}
