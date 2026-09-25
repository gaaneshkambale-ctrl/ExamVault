using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Question.API.Authorization;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Question.Application.Interfaces;
using OnlineExamSystem.Question.Application.Questions.BulkAssignSection;
using OnlineExamSystem.Question.Application.Questions.Create;
using OnlineExamSystem.Question.Application.Questions.Delete;
using OnlineExamSystem.Question.Application.Questions.DeleteForExam;
using OnlineExamSystem.Question.Application.Questions.GetById;
using OnlineExamSystem.Question.Application.Questions.List;
using OnlineExamSystem.Question.Application.Questions.ListAll;
using OnlineExamSystem.Question.Application.Questions.UnassignSection;
using OnlineExamSystem.Question.Application.Questions.Update;
using OnlineExamSystem.Question.Infrastructure.Clients;
using OnlineExamSystem.Question.Infrastructure.Multitenancy;
using OnlineExamSystem.Question.Infrastructure.Persistence;
using OnlineExamSystem.Question.Infrastructure.Repositories;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.API;

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

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentTenant, HttpContextCurrentTenant>();
        builder.Services.AddDbContext<QuestionDbContext>(options =>
            options.UseSqlServer(
                builder.Configuration.GetConnectionString("QuestionDb"),
                // Same transient-failure resiliency as every other service's
                // DbContext registration - see ExamService's Program.cs for
                // the real incident that prompted this across all of them.
                sqlOptions => sqlOptions.EnableRetryOnFailure()));
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<QuestionDbContext>("database");
        builder.Services.AddScoped<IQuestionRepository, QuestionRepository>();

        builder.Services.AddScoped<IValidator<CreateQuestionCommand>, CreateQuestionValidator>();
        builder.Services.AddScoped<CreateQuestionHandler>();
        builder.Services.AddScoped<GetQuestionHandler>();
        builder.Services.AddScoped<ListQuestionsHandler>();
        builder.Services.AddScoped<ListAllQuestionsHandler>();
        builder.Services.AddScoped<IValidator<UpdateQuestionCommand>, UpdateQuestionValidator>();
        builder.Services.AddScoped<UpdateQuestionHandler>();
        builder.Services.AddScoped<DeleteQuestionHandler>();
        builder.Services.AddScoped<BulkAssignSectionHandler>();
        builder.Services.AddScoped<UnassignSectionHandler>();
        builder.Services.AddScoped<DeleteForExamHandler>();

        var notificationServiceBaseUrl = builder.Configuration["Services:NotificationServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:NotificationServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IAuditClient, AuditClient>(client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            // Fire-and-forget audit write must fail fast, not hang on the default
            // 100s HttpClient timeout - a down NotificationService would otherwise
            // make every audited business action (exam/question/user create, etc.)
            // multi-second-to-100s slow instead of merely un-audited. Same value
            // as the "system-logs" client below.
            client.Timeout = TimeSpan.FromSeconds(3);
        }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            // HttpClient.Timeout alone measured ~7-12s against a stopped
            // container in this environment (DNS-resolution-to-a-torn-down-
            // endpoint overhead sits partly outside that timeout's reach).
            // ConnectTimeout bounds the DNS+TCP-connect phase specifically,
            // giving the fast-fail this client actually needs.
            ConnectTimeout = TimeSpan.FromSeconds(2),
        });
        builder.Services.AddHttpClient("system-logs", client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(3);
        });

        var userServiceBaseUrl = builder.Configuration["Services:UserServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:UserServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IPermissionVersionClient, PermissionVersionClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddHttpClient<IInternalUserLookupClient, InternalUserServiceClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl.TrimEnd('/') + "/"));

        var executionServiceBaseUrl = builder.Configuration["Services:ExecutionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:ExecutionServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<ISqlExpectedOutputClient, SqlExpectedOutputClient>(client =>
            client.BaseAddress = new Uri(executionServiceBaseUrl.TrimEnd('/') + "/"));

        builder.Services.AddMemoryCache();
        builder.Services.AddScoped<IPermissionVersionGuard, PermissionVersionGuard>();

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
        builder.Services.AddAuthorization(options =>
        {
            options.AddFeaturePolicies();
            options.AddPermissionPolicies();
        });

        var app = builder.Build();
        app.UseForwardedHeaders();

        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<QuestionDbContext>().Database.Migrate();
        }

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
                    .LogError(exception, "Unhandled exception in Question Service.");
                await ReportSystemErrorAsync(context, exception, "Question Service");
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
    // real 500 response for the error that triggered this.
    private static async Task ReportSystemErrorAsync(HttpContext context, Exception exception, string serviceName)
    {
        try
        {
            var currentTenant = context.RequestServices.GetService<ICurrentTenant>();
            var request = new RecordSystemErrorLogRequest(
                serviceName,
                "Error",
                exception.Message,
                exception.GetType().Name,
                exception.StackTrace,
                context.Request.Path,
                context.Request.Method,
                currentTenant?.IsAuthenticated == true ? currentTenant.TenantId : null,
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
