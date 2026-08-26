using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;

namespace OnlineExamSystem.ApiGateway.Multitenancy;

public class TenantLookupClient : ITenantLookupClient
{
    // Short TTL, not zero - this is a routing-legitimacy check on every
    // request, not an authorization decision (that's still the JWT +
    // per-service query filters), so a stale-by-up-to-a-minute view of a
    // just-created or just-deactivated tenant is an acceptable trade-off
    // for not hitting User Service on every single request.
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);

    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;

    public TenantLookupClient(HttpClient httpClient, IMemoryCache cache)
    {
        _httpClient = httpClient;
        _cache = cache;
    }

    public async Task<TenantLookupResult?> GetBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var cacheKey = $"tenant-slug:{slug.ToLowerInvariant()}";
        if (_cache.TryGetValue(cacheKey, out TenantLookupResult? cached))
        {
            return cached;
        }

        var response = await _httpClient.GetAsync(
            $"internal/tenants/by-slug/{Uri.EscapeDataString(slug)}",
            cancellationToken);

        var result = response.IsSuccessStatusCode
            ? await response.Content.ReadFromJsonAsync<TenantLookupResult>(cancellationToken: cancellationToken)
            : null;

        _cache.Set(cacheKey, result, CacheDuration);
        return result;
    }
}
