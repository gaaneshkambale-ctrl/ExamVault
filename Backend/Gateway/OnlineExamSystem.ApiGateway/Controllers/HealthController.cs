using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace OnlineExamSystem.ApiGateway.Controllers;

// Public target for an EXTERNAL uptime monitor (it has to keep alerting even
// when the whole VPS is down, so it can't live on the VPS). Runs the same
// per-service /health probes as Super Admin > System Monitoring, but only
// ever says ok/degraded - never which service or why, since this is
// anonymous. Cached briefly so repeated calls can't be used to hammer the
// downstream services.
[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private const string CacheKey = "public-health";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(30);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IMemoryCache cache,
        ILogger<HealthController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var healthy = await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            var probes = await MonitoringController.ProbeAllAsync(_httpClientFactory, _configuration, cancellationToken);
            var unhealthy = probes.Where(p => p.Status != "Online").Select(p => $"{p.Name}={p.Status}").ToList();
            if (unhealthy.Count > 0)
            {
                // Server log only (the public response never names services) -
                // tells whoever gets the uptime alert where to look first.
                _logger.LogWarning("Public health check degraded: {Services}", string.Join(", ", unhealthy));
            }
            return unhealthy.Count == 0;
        });

        return healthy
            ? Ok(new { status = "ok" })
            : StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "degraded" });
    }
}
