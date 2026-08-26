using Microsoft.Extensions.Options;
using OnlineExamSystem.User.Infrastructure.Authentication;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public static class JwtTestHelper
{
    public static JwtTokenService CreateService() => new(Options.Create(new JwtSettings
    {
        Issuer = "ExamVault.Tests",
        Audience = "ExamVault.Tests",
        SigningKey = "test-signing-key-at-least-32-bytes-long!",
        AccessTokenMinutes = 15,
        RefreshTokenDays = 7,
    }));
}
