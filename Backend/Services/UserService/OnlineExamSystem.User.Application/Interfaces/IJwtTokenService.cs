using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateAccessToken(AppUser user, IReadOnlyList<PlanFeature> enabledFeatures, IReadOnlyList<string> grantedPermissions);
    string GenerateRefreshToken();
    string HashToken(string token);
    DateTime GetRefreshTokenExpiry();
}
