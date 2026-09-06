using Microsoft.Extensions.Options;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Infrastructure.Email;

public class TenantUrlBuilder : ITenantUrlBuilder
{
    private readonly AppUrlSettings _settings;

    public TenantUrlBuilder(IOptions<AppUrlSettings> settings)
    {
        _settings = settings.Value;
    }

    public string GetLoginUrl(string? tenantSlug, bool isActive = true) => BuildTenantUrl(tenantSlug, isActive, "/login");

    public string GetResetPasswordUrl(string? tenantSlug, bool isActive, string token) =>
        BuildTenantUrl(tenantSlug, isActive, $"/reset-password?token={Uri.EscapeDataString(token)}");

    private string BuildTenantUrl(string? tenantSlug, bool isActive, string path)
    {
        if (string.IsNullOrWhiteSpace(tenantSlug) ||
            !isActive ||
            tenantSlug.Equals(TenantConstants.DefaultTenantSlug, StringComparison.OrdinalIgnoreCase) ||
            tenantSlug.Equals(TenantConstants.PlatformTenantSlug, StringComparison.OrdinalIgnoreCase))
        {
            return $"{_settings.FrontendBaseUrl.TrimEnd('/')}{path}";
        }

        var scheme = string.IsNullOrWhiteSpace(_settings.Scheme) ? "http" : _settings.Scheme.TrimEnd(':', '/');
        var baseDomain = _settings.BaseDomain.TrimStart('.');

        return $"{scheme}://{tenantSlug.ToLowerInvariant()}.{baseDomain}{path}";
    }
}
