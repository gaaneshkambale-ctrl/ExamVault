using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeTenantUrlBuilder : ITenantUrlBuilder
{
    public string GetLoginUrl(string? tenantSlug, bool isActive = true) =>
        $"http://{tenantSlug ?? "app"}.example.test/login";

    public string GetResetPasswordUrl(string? tenantSlug, bool isActive, string token) =>
        $"http://{tenantSlug ?? "app"}.example.test/reset-password?token={token}";
}
