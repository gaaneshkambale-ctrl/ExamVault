using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Execution.Application.Interfaces;
using OnlineExamSystem.Execution.Application.Run;
using OnlineExamSystem.Execution.Application.Sql;
using OnlineExamSystem.Execution.Infrastructure;
using OnlineExamSystem.Execution.Infrastructure.Drivers;

namespace OnlineExamSystem.Execution.API;

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
        builder.Services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor;
            options.ForwardLimit = 1;
            options.KnownProxies.Clear();
            options.KnownNetworks.Clear();
            foreach (var (prefix, length) in new[] { ("10.0.0.0", 8), ("172.16.0.0", 12), ("192.168.0.0", 16), ("127.0.0.0", 8) })
            {
                options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(System.Net.IPAddress.Parse(prefix), length));
            }
        });

        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // No DbContext/repository registrations here - Execution Service owns no database.
        builder.Services.AddHealthChecks();

        var pistonBaseUrl = builder.Configuration["Piston:BaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Piston:BaseUrl\" configuration.");
        builder.Services.AddHttpClient<IPistonClient, PistonClient>(client =>
            client.BaseAddress = new Uri(pistonBaseUrl.TrimEnd('/') + "/"));

        builder.Services.AddSingleton<IDriverGenerator, PythonDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, JavaScriptDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, JavaDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, CSharpDriverGenerator>();
        builder.Services.AddSingleton<IDriverGenerator, CppDriverGenerator>();

        builder.Services.AddScoped<IValidator<RunCodeCommand>, RunCodeValidator>();
        builder.Services.AddScoped<RunCodeHandler>();

        var questionServiceBaseUrl = builder.Configuration["Services:QuestionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:QuestionServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IQuestionServiceClient, QuestionServiceClient>(client =>
            client.BaseAddress = new Uri(questionServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddScoped<RunSqlHandler>();
        builder.Services.AddScoped<ComputeSqlExpectedOutputHandler>();

        var notificationServiceBaseUrl = builder.Configuration["Services:NotificationServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:NotificationServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient("system-logs", client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(3);
        });

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

        var app = builder.Build();
        app.UseForwardedHeaders();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        // First, so it wraps every later middleware/controller.
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            if (exception is not null)
            {
                context.RequestServices.GetRequiredService<ILogger<Program>>()
                    .LogError(exception, "Unhandled exception in Execution Service.");
                await ReportSystemErrorAsync(context, exception, "Execution Service");
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { message = "An unexpected error occurred." }));
        }));

        app.UseHttpsRedirection();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = WriteHealthCheckResponse });
        app.MapControllers();

        app.Run();
    }

    // Fire-and-forget to Notification Service's system-logs endpoint - never
    // throws, a down/unreachable Notification Service must never mask the
    // real 500 response for the error that triggered this. No ICurrentTenant
    // here - Execution Service owns no tenant-scoped data, so TenantId
    // always null.
    private static async Task ReportSystemErrorAsync(HttpContext context, Exception exception, string serviceName)
    {
        try
        {
            var request = new RecordSystemErrorLogRequest(
                serviceName,
                "Error",
                exception.Message,
                exception.GetType().Name,
                exception.StackTrace,
                context.Request.Path,
                context.Request.Method,
                TenantId: null,
                IpAddress: context.Connection.RemoteIpAddress?.ToString());

            var client = context.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient("system-logs");
            await client.PostAsJsonAsync("api/system-logs", request);
        }
        catch
        {
            // Swallow - logging failures must never mask the real error response.
        }
    }

    // Gateway's MonitoringController is the only consumer - no [Authorize] here,
    // this is an infra probe like every other service's /health.
    private static Task WriteHealthCheckResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new { name = e.Key, status = e.Value.Status.ToString() }),
        };
        return context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}
