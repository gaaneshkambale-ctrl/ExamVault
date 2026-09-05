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

        // Add services to the container.

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentTenant, HttpContextCurrentTenant>();
        builder.Services.AddDbContext<QuestionDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("QuestionDb")));
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
        builder.Services.AddHttpClient<IPermissionVersionClient, PermissionVersionClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddHttpClient<IInternalUserLookupClient, InternalUserServiceClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl.TrimEnd('/') + "/"));
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
