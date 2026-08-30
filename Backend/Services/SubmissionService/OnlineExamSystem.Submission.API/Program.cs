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
using OnlineExamSystem.Submission.API.Authorization;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Submission.Application.Attempts.CompleteSection;
using OnlineExamSystem.Submission.Application.Attempts.EnterSection;
using OnlineExamSystem.Submission.Application.Attempts.ForceSubmit;
using OnlineExamSystem.Submission.Application.Attempts.Grade;
using OnlineExamSystem.Submission.Application.Attempts.JoinRecording;
using OnlineExamSystem.Submission.Application.Attempts.ListByExam;
using OnlineExamSystem.Submission.Application.Attempts.ListByUser;
using OnlineExamSystem.Submission.Application.Attempts.ListLiveByExam;
using OnlineExamSystem.Submission.Application.Attempts.ListUngradedByExam;
using OnlineExamSystem.Submission.Application.Attempts.Mine;
using OnlineExamSystem.Submission.Application.Attempts.RecordFullscreenExit;
using OnlineExamSystem.Submission.Application.Attempts.RecordProctoringViolation;
using OnlineExamSystem.Submission.Application.Attempts.ListViolationsByExam;
using OnlineExamSystem.Submission.Application.Attempts.SaveAnswer;
using OnlineExamSystem.Submission.Application.Attempts.SetLiveWatch;
using OnlineExamSystem.Submission.Application.Attempts.Start;
using OnlineExamSystem.Submission.Application.Attempts.Submit;
using OnlineExamSystem.Submission.Application.Attempts.UpdateViolationStatus;
using OnlineExamSystem.Submission.Application.Attempts.WatchRecording;
using OnlineExamSystem.Shared.Events.Publishing;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Submission.Application.Interfaces;
using OnlineExamSystem.Submission.Infrastructure;
using OnlineExamSystem.Submission.Infrastructure.Messaging;
using OnlineExamSystem.Submission.Infrastructure.Multitenancy;
using OnlineExamSystem.Submission.Infrastructure.Persistence;
using OnlineExamSystem.Submission.Infrastructure.Repositories;

namespace OnlineExamSystem.Submission.API;

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
        builder.Services.AddDbContext<SubmissionDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("SubmissionDb")));
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<SubmissionDbContext>("database");
        builder.Services.AddScoped<ISubmissionRepository, SubmissionRepository>();

        if (builder.Configuration["Messaging:Provider"] == "ServiceBus")
        {
            builder.Services.Configure<ServiceBusSettings>(builder.Configuration.GetSection("ServiceBus"));
            builder.Services.AddSingleton<IEventPublisher, ServiceBusEventPublisher>();
        }
        else
        {
            builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
            builder.Services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();
        }

        var examServiceBaseUrl = builder.Configuration["Services:ExamServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:ExamServiceBaseUrl\" configuration.");
        // Trailing slash is required: HttpClient/Uri combine a relative request path against
        // BaseAddress per RFC 3986 §5.3, which drops the last base path segment (e.g. Dapr's
        // "/v1.0/invoke/{app}/method") unless the base itself ends in "/".
        builder.Services.AddHttpClient<IExamLookupClient, ExamServiceClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddHttpClient<IAssignmentLookupClient, AssignmentServiceClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl.TrimEnd('/') + "/"));

        var notificationServiceBaseUrl = builder.Configuration["Services:NotificationServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:NotificationServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient("system-logs", client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(3);
        });

        // Optional: student exam recording via Metered.ca. Falls back to a
        // no-op implementation when unconfigured, rather than requiring it
        // like ExamServiceBaseUrl above - recording is an enhancement, not
        // something every deployment needs to provide.
        var meteredApiKey = builder.Configuration["Metered:ApiKey"];
        var meteredAppDomain = builder.Configuration["Metered:AppDomain"];
        if (!string.IsNullOrWhiteSpace(meteredApiKey) && !string.IsNullOrWhiteSpace(meteredAppDomain))
        {
            builder.Services.AddHttpClient("MeteredClient", client =>
                client.BaseAddress = new Uri($"https://{meteredAppDomain.TrimEnd('/')}/"));
            builder.Services.AddScoped<IVideoRecordingService>(sp => new MeteredVideoRecordingService(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient("MeteredClient"),
                meteredApiKey,
                meteredAppDomain,
                sp.GetRequiredService<ILogger<MeteredVideoRecordingService>>()));
        }
        else
        {
            builder.Services.AddScoped<IVideoRecordingService, NullVideoRecordingService>();
        }

        builder.Services.AddScoped<IValidator<StartAttemptCommand>, StartAttemptValidator>();
        builder.Services.AddScoped<StartAttemptHandler>();
        builder.Services.AddScoped<IValidator<SaveAnswerCommand>, SaveAnswerValidator>();
        builder.Services.AddScoped<SaveAnswerHandler>();
        builder.Services.AddScoped<IValidator<SubmitAttemptCommand>, SubmitAttemptValidator>();
        builder.Services.AddScoped<SubmitAttemptHandler>();
        builder.Services.AddScoped<ForceSubmitAttemptHandler>();
        builder.Services.AddScoped<JoinRecordingHandler>();
        builder.Services.AddScoped<SetLiveWatchHandler>();
        builder.Services.AddScoped<WatchRecordingHandler>();
        builder.Services.AddScoped<GetMyAttemptHandler>();
        builder.Services.AddScoped<ListAttemptsByExamHandler>();
        builder.Services.AddScoped<ListLiveAttemptsByExamHandler>();
        builder.Services.AddScoped<ListAttemptsByUserHandler>();
        builder.Services.AddScoped<RecordFullscreenExitHandler>();
        builder.Services.AddScoped<RecordProctoringViolationHandler>();
        builder.Services.AddScoped<ListViolationsByExamHandler>();
        builder.Services.AddScoped<UpdateViolationStatusHandler>();
        builder.Services.AddScoped<EnterSectionHandler>();
        builder.Services.AddScoped<CompleteSectionHandler>();
        builder.Services.AddScoped<IValidator<GradeAnswerCommand>, GradeAnswerValidator>();
        builder.Services.AddScoped<GradeAnswerHandler>();
        builder.Services.AddScoped<ListUngradedAnswersByExamHandler>();

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
        builder.Services.AddAuthorization(options => options.AddFeaturePolicies());

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<SubmissionDbContext>().Database.Migrate();
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
                    .LogError(exception, "Unhandled exception in Submission Service.");
                await ReportSystemErrorAsync(context, exception, "Submission Service");
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
                currentTenant?.IsAuthenticated == true ? currentTenant.TenantId : null);

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
