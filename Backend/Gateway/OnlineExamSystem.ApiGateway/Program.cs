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

                    // Allow explicitly configured origins or any *.examvaults.in / *.examvault.com subdomain
                    return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase) ||
                           uri.Host.EndsWith(".examvaults.in", StringComparison.OrdinalIgnoreCase) ||
                           uri.Host.EndsWith(".examvault.com", StringComparison.OrdinalIgnoreCase);
                })
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
        });

        var app = builder.Build();

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
                        TenantId: null);

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
