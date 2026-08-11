using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Interfaces;

public interface IJwtTokenService
{
    string GenerateAccessToken(AppUser user);
    string GenerateRefreshToken();
    string HashToken(string token);
    DateTime GetRefreshTokenExpiry();
}
