using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.ApiGateway.Multitenancy;

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
        // so each environment (local dev, Azure dev/qa/prod) can allow its own frontend
        // URL without a code change. Falls back to the local Vite dev server only.
        var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:5173")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        const string frontendCorsPolicy = "Frontend";
        builder.Services.AddCors(options =>
        {
            options.AddPolicy(frontendCorsPolicy, policy =>
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod());
        });

        var app = builder.Build();

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
