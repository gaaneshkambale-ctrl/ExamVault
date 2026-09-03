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
using OnlineExamSystem.Exam.API.Authorization;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Exam.Application.Assignments.Cancel;
using OnlineExamSystem.Exam.Application.Assignments.Create;
using OnlineExamSystem.Exam.Application.Assignments.Delete;
using OnlineExamSystem.Exam.Application.Assignments.GetById;
using OnlineExamSystem.Exam.Application.Assignments.List;
using OnlineExamSystem.Exam.Application.Assignments.Mine;
using OnlineExamSystem.Exam.Application.Assignments.Update;
using OnlineExamSystem.Exam.Application.Exams.ChangeStatus;
using OnlineExamSystem.Exam.Application.Exams.Create;
using OnlineExamSystem.Exam.Application.Exams.Delete;
using OnlineExamSystem.Exam.Application.Exams.GetById;
using OnlineExamSystem.Exam.Application.Exams.List;
using OnlineExamSystem.Exam.Application.Exams.Update;
using OnlineExamSystem.Exam.Application.ExamTypes.Create;
using OnlineExamSystem.Exam.Application.ExamTypes.Delete;
using OnlineExamSystem.Exam.Application.ExamTypes.List;
using OnlineExamSystem.Exam.Application.ExamTypes.Update;
using OnlineExamSystem.Exam.API.Jobs;
using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Application.Proctoring.GetProctoringSettings;
using OnlineExamSystem.Exam.Application.Proctoring.UpdateProctoringSettings;
using OnlineExamSystem.Exam.Application.Reminders.GetReminderSettings;
using OnlineExamSystem.Exam.Application.Reminders.UpdateReminderSettings;
using OnlineExamSystem.Exam.Application.Settings.GetExamDefaults;
using OnlineExamSystem.Exam.Application.Settings.GetGeneralSettings;
using OnlineExamSystem.Exam.Application.Settings.UpdateExamDefaults;
using OnlineExamSystem.Exam.Application.Settings.UpdateGeneralSettings;
using OnlineExamSystem.Exam.Application.Sections.Create;
using OnlineExamSystem.Exam.Application.Sections.Delete;
using OnlineExamSystem.Exam.Application.Sections.GetById;
using OnlineExamSystem.Exam.Application.Sections.GetOrCreateDefault;
using OnlineExamSystem.Exam.Application.Sections.List;
using OnlineExamSystem.Exam.Application.Sections.ListAll;
using OnlineExamSystem.Exam.Application.Sections.Reorder;
using OnlineExamSystem.Exam.Application.Sections.Update;
using OnlineExamSystem.Exam.Infrastructure;
using OnlineExamSystem.Exam.Infrastructure.Messaging;
using OnlineExamSystem.Exam.Infrastructure.Multitenancy;
using OnlineExamSystem.Exam.Infrastructure.Persistence;
using OnlineExamSystem.Exam.Infrastructure.Repositories;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Exam.API;

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
        builder.Services.AddDbContext<ExamDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("ExamDb")));
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<ExamDbContext>("database");
        builder.Services.AddScoped<IExamRepository, ExamRepository>();

        var notificationServiceBaseUrl = builder.Configuration["Services:NotificationServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:NotificationServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IAuditClient, AuditClient>(client =>
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddHttpClient("system-logs", client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(3);
        });

        var userServiceBaseUrl = builder.Configuration["Services:UserServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:UserServiceBaseUrl\" configuration.");
        // Trailing slash is required: HttpClient/Uri combine a relative request path against
        // BaseAddress per RFC 3986 §5.3, which drops the last base path segment (e.g. Dapr's
        // "/v1.0/invoke/{app}/method") unless the base itself ends in "/".
        var userServiceBaseUri = new Uri(userServiceBaseUrl.TrimEnd('/') + "/");
        builder.Services.AddHttpClient<IUserLookupClient, UserServiceClient>(client =>
            client.BaseAddress = userServiceBaseUri);
        builder.Services.AddHttpClient<IInternalUserLookupClient, InternalUserServiceClient>(client =>
            client.BaseAddress = userServiceBaseUri);
        builder.Services.AddHttpClient<IPermissionVersionClient, PermissionVersionClient>(client =>
            client.BaseAddress = userServiceBaseUri);
        builder.Services.AddMemoryCache();
        builder.Services.AddScoped<IPermissionVersionGuard, PermissionVersionGuard>();

        var questionServiceBaseUrl = builder.Configuration["Services:QuestionServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:QuestionServiceBaseUrl\" configuration.");
        var questionServiceBaseUri = new Uri(questionServiceBaseUrl.TrimEnd('/') + "/");
        builder.Services.AddHttpClient<IQuestionServiceClient, QuestionServiceClient>(client =>
            client.BaseAddress = questionServiceBaseUri);

        builder.Services.AddScoped<IValidator<CreateExamCommand>, CreateExamValidator>();
        builder.Services.AddScoped<CreateExamHandler>();
        builder.Services.AddScoped<GetExamHandler>();
        builder.Services.AddScoped<ListExamsHandler>();
        builder.Services.AddScoped<IValidator<UpdateExamCommand>, UpdateExamValidator>();
        builder.Services.AddScoped<UpdateExamHandler>();
        builder.Services.AddScoped<ChangeExamStatusHandler>();
        builder.Services.AddScoped<DeleteExamHandler>();

        builder.Services.AddScoped<IValidator<CreateExamTypeCommand>, CreateExamTypeValidator>();
        builder.Services.AddScoped<CreateExamTypeHandler>();
        builder.Services.AddScoped<ListExamTypesHandler>();
        builder.Services.AddScoped<DeleteExamTypeHandler>();
        builder.Services.AddScoped<IValidator<UpdateExamTypeCommand>, UpdateExamTypeValidator>();
        builder.Services.AddScoped<UpdateExamTypeHandler>();

        builder.Services.AddScoped<IValidator<CreateSectionCommand>, CreateSectionValidator>();
        builder.Services.AddScoped<CreateSectionHandler>();
        builder.Services.AddScoped<IValidator<UpdateSectionCommand>, UpdateSectionValidator>();
        builder.Services.AddScoped<UpdateSectionHandler>();
        builder.Services.AddScoped<DeleteSectionHandler>();
        builder.Services.AddScoped<GetSectionHandler>();
        builder.Services.AddScoped<ListSectionsHandler>();
        builder.Services.AddScoped<ListAllSectionsHandler>();
        builder.Services.AddScoped<ReorderSectionsHandler>();
        builder.Services.AddScoped<GetOrCreateDefaultSectionHandler>();

        builder.Services.AddScoped<IValidator<CreateAssignmentCommand>, CreateAssignmentValidator>();
        builder.Services.AddScoped<CreateAssignmentHandler>();
        builder.Services.AddScoped<IValidator<UpdateAssignmentCommand>, UpdateAssignmentValidator>();
        builder.Services.AddScoped<UpdateAssignmentHandler>();
        builder.Services.AddScoped<ListAllAssignmentsHandler>();
        builder.Services.AddScoped<ListAssignmentsForExamHandler>();
        builder.Services.AddScoped<GetAssignmentHandler>();
        builder.Services.AddScoped<DeleteAssignmentHandler>();
        builder.Services.AddScoped<CancelAssignmentHandler>();
        builder.Services.AddScoped<GetMyAssignmentForExamHandler>();

        builder.Services.AddScoped<GetReminderSettingsHandler>();
        builder.Services.AddScoped<UpdateReminderSettingsHandler>();
        builder.Services.AddScoped<GetProctoringSettingsHandler>();
        builder.Services.AddScoped<UpdateProctoringSettingsHandler>();
        builder.Services.AddScoped<GetGeneralSettingsHandler>();
        builder.Services.AddScoped<UpdateGeneralSettingsHandler>();
        builder.Services.AddScoped<GetExamDefaultsHandler>();
        builder.Services.AddScoped<UpdateExamDefaultsHandler>();

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
        builder.Services.AddHostedService<ExamReminderCheckService>();

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

        using (var scope = app.Services.CreateScope())
        {
            scope.ServiceProvider.GetRequiredService<ExamDbContext>().Database.Migrate();
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
                    .LogError(exception, "Unhandled exception in Exam Service.");
                await ReportSystemErrorAsync(context, exception, "Exam Service");
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
