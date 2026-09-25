using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.ApiGateway.Multitenancy;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;

namespace OnlineExamSystem.ApiGateway;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Real client IP: every request arrives via a proxy (Traefik -> Gateway ->
        // service), so Connection.RemoteIpAddress is otherwise the proxy container's
        // Docker IP (172.18.x.x) - which is what audit logs, sessions, System Logs
        // and the per-IP auth rate limiter were all recording/keying on. Only the
        // last hop is honoured (ForwardLimit 1), and only when that hop is a
        // private-network proxy: Traefik appends the real client IP last, so any
        // X-Forwarded-For a client sends itself is never the value used (prod only
        // exposes the Gateway through Traefik).
        //
        // ForwardedHeaders:ClientIpHeader picks which header carries that IP.
        // Behind Cloudflare the last X-Forwarded-For hop is a Cloudflare edge,
        // so prod switches this to "CF-Connecting-IP" (a single value Cloudflare
        // always overwrites) - only safe once the origin firewall admits
        // Cloudflare's ranges alone (ActionPlan.txt, Cloudflare plan Phase 4).
        // Gateway-only: YARP still sends the resolved IP downstream as
        // X-Forwarded-For, so the services' own config never changes.
        var clientIpHeader = builder.Configuration["ForwardedHeaders:ClientIpHeader"];
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor;
            if (!string.IsNullOrWhiteSpace(clientIpHeader))
            {
                options.ForwardedForHeaderName = clientIpHeader;
            }
            options.ForwardLimit = 1;
            options.KnownProxies.Clear();
            options.KnownNetworks.Clear();
            foreach (var (prefix, length) in new[] { ("10.0.0.0", 8), ("172.16.0.0", 12), ("192.168.0.0", 16), ("127.0.0.0", 8) })
            {
                options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(System.Net.IPAddress.Parse(prefix), length));
            }
        });

        builder.Services.AddReverseProxy()
            .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

        builder.Services.AddMemoryCache();
        builder.Services.AddHttpClient<ITenantLookupClient, TenantLookupClient>(client =>
        {
            client.BaseAddress = new Uri(builder.Configuration["Services:UserServiceBaseUrl"]!);
        });

        // System Monitoring (Super Admin) - the Gateway's first controller and
        // first JWT validation of its own; every other route stays pure YARP
        // pass-through, downstream services validate the bearer token
        // themselves. MonitoringController needs to gate on SuperAdmin here
        // because it aggregates data (per-service /health) that no single
        // downstream service owns.
        builder.Services.AddControllers();

        var jwtIssuer = builder.Configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Missing \"Jwt:Issuer\" configuration.");
        var jwtAudience = builder.Configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Missing \"Jwt:Audience\" configuration.");
        var jwtSigningKey = builder.Configuration["Jwt:SigningKey"]
            ?? throw new InvalidOperationException("Missing \"Jwt:SigningKey\" configuration.");

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                };
            });
        builder.Services.AddAuthorization();

        // Named HttpClients MonitoringController probes for /health - short
        // timeout since these are liveness checks, not real requests.
        foreach (var (key, configKey) in new[]
        {
            ("user-api", "Services:UserServiceBaseUrl"),
            ("exam-api", "Services:ExamServiceBaseUrl"),
            ("question-api", "Services:QuestionServiceBaseUrl"),
            ("ai-api", "Services:AiServiceBaseUrl"),
            ("submission-api", "Services:SubmissionServiceBaseUrl"),
            ("result-api", "Services:ResultServiceBaseUrl"),
            ("notification-api", "Services:NotificationServiceBaseUrl"),
            ("execution-api", "Services:ExecutionServiceBaseUrl"),
        })
        {
            var baseUrl = builder.Configuration[configKey]
                ?? throw new InvalidOperationException($"Missing \"{configKey}\" configuration.");
            builder.Services.AddHttpClient(key, client =>
            {
                client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
                client.Timeout = TimeSpan.FromSeconds(3);
            });
        }

        var rabbitMqManagementUrl = builder.Configuration["RabbitMq:ManagementUrl"]
            ?? throw new InvalidOperationException("Missing \"RabbitMq:ManagementUrl\" configuration.");
        builder.Services.AddHttpClient("rabbitmq-management", client =>
        {
            client.BaseAddress = new Uri(rabbitMqManagementUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(3);
        });

        // Allowed frontend origins come from config (Cors:AllowedOrigins, comma-separated)
        // plus dynamic support for any *.localhost subdomain in local dev and *.examvaults.in in production.
        var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:5173")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        const string frontendCorsPolicy = "Frontend";
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(frontendCorsPolicy, policy =>
                policy.SetIsOriginAllowed(origin =>
                {
                    if (string.IsNullOrWhiteSpace(origin)) return false;
                    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;

                    // Allow localhost and any *.localhost on any port in local dev
                    if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
                        uri.Host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    // Allow explicitly configured origins, the bare apex domains
                    // themselves (examvaults.in/examvault.com - EndsWith(".x") alone
                    // misses the apex since it has no leading dot), and any subdomain.
                    return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
                           uri.Host.Equals("examvaults.in", StringComparison.OrdinalIgnoreCase) ||
                           uri.Host.EndsWith(".examvaults.in", StringComparison.OrdinalIgnoreCase) ||
                           uri.Host.Equals("examvault.com", StringComparison.OrdinalIgnoreCase) ||
                           uri.Host.EndsWith(".examvault.com", StringComparison.OrdinalIgnoreCase);
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
        });

        var app = builder.Build();
        app.UseForwardedHeaders();

        // First, so it wraps every later middleware/controller. Reuses the
        // "notification-api" named client already registered above for
        // MonitoringController's health probes - no ICurrentTenant here,
        // the Gateway isn't tenant-scoped in that sense, so TenantId is
        // always null.
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            if (exception is not null)
            {
                var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError(exception, "Unhandled exception in Gateway.");

                try
                {
                    var request = new RecordSystemErrorLogRequest(
                        "Gateway",
                        "Error",
                        exception.Message,
                        exception.GetType().Name,
                        exception.StackTrace,
                        context.Request.Path,
                        context.Request.Method,
                        TenantId: null,
                        IpAddress: context.Connection.RemoteIpAddress?.ToString());

                    var client = context.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("notification-api");
                    await client.PostAsJsonAsync("api/system-logs", request);
                }
                catch (Exception recordEx)
                {
                    logger.LogWarning(recordEx, "Failed to record system error log entry.");
                }
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "An unexpected error occurred." }));
        }));

        app.UseHttpsRedirection();

        // Every public API response goes through here - Traefik (the
        // production TLS-terminating proxy) doesn't add these on its own,
        // and unlike the frontend's nginx.conf this is a pure JSON API, so
        // no Content-Security-Policy (nothing here renders HTML for a CSP
        // to protect).
        app.Use(async (context, next) =>
        {
            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Append("X-Frame-Options", "DENY");
            context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
            await next();
        });

        app.UseCors(frontendCorsPolicy);

        app.UseMiddleware<TenantResolutionMiddleware>();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapGet("/", () => "ExamVault API Gateway");
        app.MapControllers();
        app.MapReverseProxy();

        app.Run();
    }
}
