using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Infrastructure;

public class PermissionVersionGuard : IPermissionVersionGuard
{
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

    private readonly IPermissionVersionClient _client;
    private readonly IMemoryCache _cache;

    public PermissionVersionGuard(IPermissionVersionClient client, IMemoryCache cache)
    {
        _client = client;
        _cache = cache;
    }

    public async Task<bool> IsFreshAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var tenantIdClaim = user.FindFirst(TenantClaimTypes.TenantId)?.Value;
        var tokenVersionClaim = user.FindFirst(PermissionClaimTypes.PermissionVersion)?.Value;
        if (!Guid.TryParse(tenantIdClaim, out var tenantId) || !int.TryParse(tokenVersionClaim, out var tokenVersion))
        {
            // No version claim (e.g. a token minted before this feature
            // shipped, or the Super Admin's own platform-tenant token) -
            // nothing to compare against, so there's nothing stale to catch.
            return true;
        }

        var cacheKey = $"permission-version:{tenantId}";
        if (!_cache.TryGetValue(cacheKey, out int currentVersion))
        {
            var fetched = await _client.GetCurrentVersionAsync(tenantId, cancellationToken);
            if (fetched is null)
            {
                // User Service unreachable or tenant not found - fail open.
                // A transient cross-service hiccup must never deny access
                // platform-wide; the existing role/claim check already ran.
                return true;
            }

            currentVersion = fetched.Value;
            _cache.Set(cacheKey, currentVersion, CacheDuration);
        }

        return tokenVersion >= currentVersion;
    }
}
