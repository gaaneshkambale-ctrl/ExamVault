using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace OnlineExamSystem.ApiGateway.Controllers;

// Real data only for the Super Admin System Monitoring pages (see
// ActionPlan.txt's "SYSTEM MONITORING (real parts only)" section) - probes
// every downstream service's own /health endpoint (added alongside this
// controller) rather than faking anything. No historical/host-resource
// metrics here by design - nothing in this codebase collects them.
[ApiController]
[Route("api/monitoring")]
[Authorize(Roles = "SuperAdmin")]
public class MonitoringController : ControllerBase
{
    // (display name, appsettings config key for that service's base URL).
    // Gateway itself is reported separately below - if this request is
    // being served, the Gateway is trivially online.
    private static readonly (string Name, string ConfigKey)[] Services =
    [
        ("User Service", "Services:UserServiceBaseUrl"),
        ("Exam Service", "Services:ExamServiceBaseUrl"),
        ("Question Service", "Services:QuestionServiceBaseUrl"),
        ("AI Service", "Services:AiServiceBaseUrl"),
        ("Submission Service", "Services:SubmissionServiceBaseUrl"),
        ("Result Service", "Services:ResultServiceBaseUrl"),
        ("Notification Service", "Services:NotificationServiceBaseUrl"),
        ("Execution Service", "Services:ExecutionServiceBaseUrl"),
    ];

    // The 5 services whose /health includes a "database" check (see each
    // one's Program.cs AddDbContextCheck registration) - rolls up into the
    // System Health widget's Database row. Ai/Execution/Result own no
    // database, so they never factor into that rollup.
    private static readonly HashSet<string> DbBackedServices = new(StringComparer.Ordinal)
    {
        "User Service", "Exam Service", "Question Service", "Submission Service", "Notification Service",
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public MonitoringController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpGet("services")]
    public async Task<IActionResult> GetServices(CancellationToken cancellationToken)
    {
        var probes = await ProbeAllAsync(cancellationToken);

        var result = new List<object>
        {
            new { name = "Gateway", status = "Online", responseTimeMs = 0 },
        };
        result.AddRange(probes.Select(p => (object)new { name = p.Name, status = p.Status, responseTimeMs = p.ResponseTimeMs }));

        return Ok(result);
    }

    [HttpGet("system-health")]
    public async Task<IActionResult> GetSystemHealth(CancellationToken cancellationToken)
    {
        var probes = await ProbeAllAsync(cancellationToken);
        var databaseHealthy = probes.Where(p => DbBackedServices.Contains(p.Name)).All(p => p.DatabaseHealthy);
        var messageQueueHealthy = await CheckRabbitMqAsync(cancellationToken);

        return Ok(new
        {
            database = databaseHealthy ? "Healthy" : "Unhealthy",
            messageQueue = messageQueueHealthy ? "Healthy" : "Unhealthy",
        });
    }

    private sealed record ServiceHealthProbe(string Name, string Status, int? ResponseTimeMs, bool DatabaseHealthy);

    private async Task<List<ServiceHealthProbe>> ProbeAllAsync(CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("monitoring");
        client.Timeout = TimeSpan.FromSeconds(3);

        var probes = await Task.WhenAll(Services.Select(async svc =>
        {
            var baseUrl = _configuration[svc.ConfigKey];
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                return new ServiceHealthProbe(svc.Name, "Offline", null, false);
            }

            var stopwatch = Stopwatch.StartNew();
            try
            {
                var response = await client.GetAsync(baseUrl.TrimEnd('/') + "/health", cancellationToken);
                stopwatch.Stop();

                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(body);
                var status = doc.RootElement.GetProperty("status").GetString() ?? "Unhealthy";
                var isHealthy = status == "Healthy";

                return new ServiceHealthProbe(svc.Name, isHealthy ? "Online" : "Degraded", (int)stopwatch.ElapsedMilliseconds, isHealthy);
            }
            catch
            {
                return new ServiceHealthProbe(svc.Name, "Offline", null, false);
            }
        }));

        return probes.ToList();
    }

    private async Task<bool> CheckRabbitMqAsync(CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("monitoring");
            client.Timeout = TimeSpan.FromSeconds(3);

            var managementUrl = _configuration["RabbitMq:ManagementUrl"] ?? "http://rabbitmq:15672";
            var username = _configuration["RabbitMq:UserName"] ?? "guest";
            var password = _configuration["RabbitMq:Password"] ?? "guest";

            using var request = new HttpRequestMessage(HttpMethod.Get, managementUrl.TrimEnd('/') + "/api/healthchecks/node");
            var authBytes = Encoding.ASCII.GetBytes($"{username}:{password}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));

            var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("status", out var status) && status.GetString() == "ok";
        }
        catch
        {
            return false;
        }
    }
}
