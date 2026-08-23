using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Domain.Enums;

namespace OnlineExamSystem.User.Infrastructure.Multitenancy;

public class HttpContextCurrentTenant : ICurrentTenant
{
    private readonly HttpContext? _httpContext;

    public HttpContextCurrentTenant(IHttpContextAccessor httpContextAccessor)
    {
        _httpContext = httpContextAccessor.HttpContext;
    }

    public bool IsAuthenticated => _httpContext?.User.Identity?.IsAuthenticated == true;

    public Guid TenantId
    {
        get
        {
            var claim = _httpContext?.User.FindFirstValue(TenantClaimTypes.TenantId);
            return claim is not null && Guid.TryParse(claim, out var tenantId) ? tenantId : Guid.Empty;
        }
    }

    public bool IsSuperAdmin =>
        string.Equals(_httpContext?.User.FindFirstValue(ClaimTypes.Role), nameof(UserRole.SuperAdmin), StringComparison.OrdinalIgnoreCase);
}
