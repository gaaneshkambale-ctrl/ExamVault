using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Notification.Application.Audit.Admin.ListAuditLogs;
using OnlineExamSystem.Notification.Application.Audit.RecordAuditLog;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;
using OnlineExamSystem.Notification.Application.Notifications.Admin.DeleteNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistoryStats;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.CreateTemplate;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.DuplicateTemplate;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.ListTemplates;
using OnlineExamSystem.Notification.Application.Notifications.Admin.Templates.UpdateTemplate;
using OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetNotificationById;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetUnreadCount;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAllAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;
using OnlineExamSystem.Notification.Application.Settings.GetSystemSettings;
using OnlineExamSystem.Notification.Application.Settings.UpdateSystemSettings;
using OnlineExamSystem.Notification.Application.SystemLogs.ListSystemErrorLogs;
using OnlineExamSystem.Notification.Application.SystemLogs.RecordSystemErrorLog;
using OnlineExamSystem.Notification.Application.SystemLogs.ResolveSystemErrorLog;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Notification.API.Jobs;
using OnlineExamSystem.Notification.Infrastructure.Clients;
using OnlineExamSystem.Notification.Infrastructure.Email;
using OnlineExamSystem.Notification.Infrastructure.Multitenancy;
using OnlineExamSystem.Notification.Infrastructure.Persistence;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.API;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentTenant, HttpContextCurrentTenant>();
        builder.Services.AddDbContext<NotificationDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("NotificationDb")));
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<NotificationDbContext>("database");
        builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
        builder.Services.AddScoped<INotificationTemplateRepository, NotificationTemplateRepository>();
        builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        builder.Services.AddScoped<ISystemSettingsRepository, SystemSettingsRepository>();
        builder.Services.AddScoped<ISystemErrorLogRepository, SystemErrorLogRepository>();
        builder.Services.AddScoped<RecordAuditLogHandler>();
        builder.Services.AddScoped<ListAuditLogsHandler>();
        builder.Services.AddScoped<GetSystemSettingsHandler>();
        builder.Services.AddScoped<IValidator<UpdateSystemSettingsCommand>, UpdateSystemSettingsValidator>();
        builder.Services.AddScoped<UpdateSystemSettingsHandler>();
        builder.Services.AddScoped<RecordSystemErrorLogHandler>();
        builder.Services.AddScoped<ListSystemErrorLogsHandler>();
        builder.Services.AddScoped<ResolveSystemErrorLogHandler>();
        builder.Services.AddHostedService<AuditLogRetentionCleanupService>();
        builder.Services.AddHostedService<SystemErrorLogRetentionCleanupService>();

        builder.Services.Configure<N8nSettings>(builder.Configuration.GetSection("N8n"));
        builder.Services.AddHttpClient<IEmailDispatcher, N8nEmailDispatcher>();
        builder.Services.AddScoped<INotificationPersistenceService, NotificationPersistenceService>();

        // Trailing slash is required: HttpClient/Uri combine a relative request path against
        // BaseAddress per RFC 3986 §5.3, which drops the last base path segment (e.g. Dapr's
        // "/v1.0/invoke/{app}/method") unless the base itself ends in "/".
        var userServiceBaseUrl = builder.Configuration["Services:UserServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:UserServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IUserDirectoryClient, UserDirectoryClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl.TrimEnd('/') + "/"));

        var examServiceBaseUrl = builder.Configuration["Services:ExamServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:ExamServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IExamAssignmentLookupClient, ExamAssignmentLookupClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl.TrimEnd('/') + "/"));

        builder.Services.AddScoped<GetMyNotificationsHandler>();
        builder.Services.AddScoped<GetNotificationByIdHandler>();
        builder.Services.AddScoped<GetUnreadCountHandler>();
        builder.Services.AddScoped<MarkAsReadHandler>();
        builder.Services.AddScoped<MarkAllAsReadHandler>();
        builder.Services.AddScoped<DeleteMyNotificationHandler>();
        builder.Services.AddScoped<GetMyPreferencesHandler>();
        builder.Services.AddScoped<IValidator<SavePreferencesCommand>, SavePreferencesValidator>();
        builder.Services.AddScoped<SavePreferencesHandler>();

        builder.Services.AddScoped<IValidator<CreateNotificationCommand>, CreateNotificationValidator>();
        builder.Services.AddScoped<CreateNotificationHandler>();
        builder.Services.AddScoped<GetNotificationHistoryHandler>();
        builder.Services.AddScoped<GetNotificationHistoryStatsHandler>();
        builder.Services.AddScoped<GetNotificationBatchDetailsHandler>();
        builder.Services.AddScoped<ResendNotificationBatchHandler>();
        builder.Services.AddScoped<DeleteNotificationBatchHandler>();
        builder.Services.AddScoped<ListTemplatesHandler>();
        builder.Services.AddScoped<IValidator<CreateTemplateCommand>, CreateTemplateValidator>();
        builder.Services.AddScoped<CreateTemplateHandler>();
        builder.Services.AddScoped<IValidator<UpdateTemplateCommand>, UpdateTemplateValidator>();
        builder.Services.AddScoped<UpdateTemplateHandler>();
        builder.Services.AddScoped<DuplicateTemplateHandler>();

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

        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<NotificationDbContext>().Database.Migrate();
        }

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        // First, so it wraps every later middleware/controller. Reports directly
        // to RecordSystemErrorLogHandler in-process rather than over HTTP - this
        // IS the service the other 8 report to, calling out to itself would just
        // be a pointless round-trip to its own not-yet-recovered process.
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
            if (exception is not null)
            {
                var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogError(exception, "Unhandled exception in Notification Service.");

                try
                {
                    var currentTenant = context.RequestServices.GetRequiredService<ICurrentTenant>();
                    var recordHandler = context.RequestServices.GetRequiredService<RecordSystemErrorLogHandler>();
                    await recordHandler.HandleAsync(new RecordSystemErrorLogCommand(
                        "Notification Service",
                        SystemLogLevel.Error,
                        exception.Message,
                        exception.GetType().Name,
                        exception.StackTrace,
                        context.Request.Path,
                        context.Request.Method,
                        currentTenant.IsAuthenticated ? currentTenant.TenantId : null));
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

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = WriteHealthCheckResponse });
        app.MapControllers();

        app.Run();
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
