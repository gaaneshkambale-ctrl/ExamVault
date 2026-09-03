using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;
using OnlineExamSystem.Shared.Events.Publishing;
using OnlineExamSystem.User.API.Authorization;
using OnlineExamSystem.User.API.Jobs;
using OnlineExamSystem.User.Application.Plans.Create;
using OnlineExamSystem.User.Application.Plans.Delete;
using OnlineExamSystem.User.Application.Plans.List;
using OnlineExamSystem.User.Application.Plans.Update;
using OnlineExamSystem.User.Application.Tenants.AssignPlan;
using OnlineExamSystem.User.Application.Groups.AddMember;
using OnlineExamSystem.User.Application.Groups.Create;
using OnlineExamSystem.User.Application.Groups.Delete;
using OnlineExamSystem.User.Application.Groups.GetById;
using OnlineExamSystem.User.Application.Groups.List;
using OnlineExamSystem.User.Application.Groups.RemoveMember;
using OnlineExamSystem.User.Application.Users.RolePermissions.GetAll;
using OnlineExamSystem.User.Application.Users.RolePermissions.Update;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Application.Users.ChangePassword;
using OnlineExamSystem.User.Application.Users.Create;
using OnlineExamSystem.User.Application.Users.Delete;
using OnlineExamSystem.User.Application.Users.GetMyPreferences;
using OnlineExamSystem.User.Application.Users.GetProfile;
using OnlineExamSystem.User.Application.Users.Internal.GetUsersByIds;
using OnlineExamSystem.User.Application.Users.List;
using OnlineExamSystem.User.Application.Users.ListSessions;
using OnlineExamSystem.User.Application.Users.Login;
using OnlineExamSystem.User.Application.Users.Logout;
using OnlineExamSystem.User.Application.Users.Register;
using OnlineExamSystem.User.Application.Users.GetMySessions;
using OnlineExamSystem.User.Application.Users.ResetPassword;
using OnlineExamSystem.User.Application.Users.RevokeOtherSessions;
using OnlineExamSystem.User.Application.Users.RevokeSession;
using OnlineExamSystem.User.Application.Users.SetActiveStatus;
using OnlineExamSystem.User.Application.Tenants.Create;
using OnlineExamSystem.User.Application.Tenants.CreateAdmin;
using OnlineExamSystem.User.Application.Tenants.Delete;
using OnlineExamSystem.User.Application.Tenants.GetBySlug;
using OnlineExamSystem.User.Application.Tenants.GetPermissionVersion;
using OnlineExamSystem.User.Application.Tenants.GetLimits;
using OnlineExamSystem.User.Application.Tenants.GetRolePermissions;
using OnlineExamSystem.User.Application.Tenants.List;
using OnlineExamSystem.User.Application.Tenants.ResetAdminPassword;
using OnlineExamSystem.User.Application.Tenants.SetActiveStatus;
using OnlineExamSystem.User.Application.Tenants.SetTrial;
using OnlineExamSystem.User.Application.Tenants.Update;
using OnlineExamSystem.User.Application.Tenants.UpdateRolePermissions;
using OnlineExamSystem.User.Application.Settings.GetEmailConnectionStatus;
using OnlineExamSystem.User.Application.Settings.GetEmailSummary;
using OnlineExamSystem.User.Application.Settings.GetPlatformSettings;
using OnlineExamSystem.User.Application.Settings.UpdatePlatformSettings;
using OnlineExamSystem.User.Application.Security;
using OnlineExamSystem.User.Application.Users.TokenRefresh;
using OnlineExamSystem.User.Application.Users.Update;
using OnlineExamSystem.User.Application.Users.UpdateMyPhoto;
using OnlineExamSystem.User.Application.Users.UpdateMyPreferences;
using OnlineExamSystem.User.Application.Users.UpdateMyProfile;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Domain.Entities;
using OnlineExamSystem.User.Domain.Enums;
using OnlineExamSystem.User.Infrastructure.Authentication;
using OnlineExamSystem.User.Infrastructure.Clients;
using OnlineExamSystem.User.Infrastructure.Email;
using OnlineExamSystem.User.Infrastructure.Messaging;
using OnlineExamSystem.User.Infrastructure.Multitenancy;
using OnlineExamSystem.User.Infrastructure.Persistence;
using OnlineExamSystem.User.Infrastructure.Repositories;

namespace OnlineExamSystem.User.API;

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
        builder.Services.AddDbContext<UserDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("UserDb")));
        builder.Services.AddHealthChecks()
            .AddDbContextCheck<UserDbContext>("database");
        builder.Services.AddScoped<IUserRepository, UserRepository>();
        builder.Services.AddScoped<IGroupRepository, GroupRepository>();
        builder.Services.AddScoped<IRolePermissionRepository, RolePermissionRepository>();
        builder.Services.AddScoped<ITenantRepository, TenantRepository>();
        builder.Services.AddScoped<IPlanRepository, PlanRepository>();
        builder.Services.AddScoped<IPlatformSettingsRepository, PlatformSettingsRepository>();
        builder.Services.AddScoped<IPasswordPolicyProvider, PasswordPolicyProvider>();
        builder.Services.AddScoped<IEmailDeliveryLogRepository, EmailDeliveryLogRepository>();

        builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
        builder.Services.AddScoped<IPasswordGenerator, PasswordGenerator>();
        builder.Services.Configure<AppUrlSettings>(builder.Configuration.GetSection(AppUrlSettings.SectionName));
        builder.Services.AddSingleton<ITenantUrlBuilder, TenantUrlBuilder>();
        builder.Services.Configure<N8nSettings>(builder.Configuration.GetSection("N8n"));
        builder.Services.AddHttpClient<IEmailDispatcher, N8nEmailDispatcher>();
        // Short timeout - this backs a Super Admin "Check Connection" button
        // click, it must fail fast rather than hang the request.
        builder.Services.AddHttpClient<IEmailConnectionChecker, N8nConnectionChecker>(client =>
            client.Timeout = TimeSpan.FromSeconds(5));

        var notificationServiceBaseUrl = builder.Configuration["Services:NotificationServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:NotificationServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IAuditClient, AuditClient>(client =>
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/"));
        builder.Services.AddHttpClient("system-logs", client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(3);
        });
        builder.Services.AddHttpClient<IEmailDeliverySummaryClient, EmailDeliverySummaryClient>(client =>
        {
            client.BaseAddress = new Uri(notificationServiceBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(5);
        });
        builder.Services.AddScoped<IValidator<RegisterUserCommand>, RegisterUserValidator>();
        builder.Services.AddScoped<RegisterUserHandler>();
        builder.Services.AddScoped<GetUserProfileHandler>();
        builder.Services.AddScoped<ListUsersHandler>();
        builder.Services.AddScoped<GetUsersByIdsHandler>();
        builder.Services.AddScoped<IValidator<CreateUserCommand>, CreateUserValidator>();
        builder.Services.AddScoped<CreateUserHandler>();
        builder.Services.AddScoped<IValidator<UpdateUserCommand>, UpdateUserValidator>();
        builder.Services.AddScoped<UpdateUserHandler>();
        builder.Services.AddScoped<DeleteUserHandler>();
        builder.Services.AddScoped<IValidator<ResetPasswordCommand>, ResetPasswordValidator>();
        builder.Services.AddScoped<ResetPasswordHandler>();
        builder.Services.AddScoped<IValidator<ChangePasswordCommand>, ChangePasswordValidator>();
        builder.Services.AddScoped<ChangePasswordHandler>();
        builder.Services.AddScoped<IValidator<LoginUserCommand>, LoginUserValidator>();
        builder.Services.AddScoped<LoginUserHandler>();
        builder.Services.AddScoped<RefreshTokenHandler>();
        builder.Services.AddScoped<LogoutHandler>();
        builder.Services.AddScoped<SetUserActiveStatusHandler>();
        builder.Services.AddScoped<ListUserSessionsHandler>();
        builder.Services.AddScoped<IValidator<UpdateMyProfileCommand>, UpdateMyProfileValidator>();
        builder.Services.AddScoped<UpdateMyProfileHandler>();
        builder.Services.AddScoped<GetMyPreferencesHandler>();
        builder.Services.AddScoped<UpdateMyPreferencesHandler>();
        builder.Services.AddScoped<UpdateMyPhotoHandler>();
        builder.Services.AddScoped<GetMySessionsHandler>();
        builder.Services.AddScoped<RevokeOtherSessionsHandler>();
        builder.Services.AddScoped<RevokeSessionHandler>();

        builder.Services.AddScoped<IValidator<CreateGroupCommand>, CreateGroupValidator>();
        builder.Services.AddScoped<CreateGroupHandler>();
        builder.Services.AddScoped<ListGroupsHandler>();
        builder.Services.AddScoped<GetGroupHandler>();
        builder.Services.AddScoped<DeleteGroupHandler>();
        builder.Services.AddScoped<AddGroupMemberHandler>();
        builder.Services.AddScoped<RemoveGroupMemberHandler>();

        builder.Services.AddScoped<GetAllRolePermissionsHandler>();
        builder.Services.AddScoped<IValidator<UpdateRolePermissionsCommand>, UpdateRolePermissionsValidator>();
        builder.Services.AddScoped<UpdateRolePermissionsHandler>();

        builder.Services.AddScoped<IValidator<CreateTenantCommand>, CreateTenantValidator>();
        builder.Services.AddScoped<CreateTenantHandler>();
        builder.Services.AddScoped<ListTenantsHandler>();
        builder.Services.AddScoped<SetTenantActiveStatusHandler>();
        builder.Services.AddScoped<GetTenantBySlugHandler>();
        builder.Services.AddScoped<GetTenantPermissionVersionHandler>();
        builder.Services.AddScoped<GetTenantLimitsHandler>();
        builder.Services.AddScoped<IValidator<CreateTenantAdminCommand>, CreateTenantAdminValidator>();
        builder.Services.AddScoped<CreateTenantAdminHandler>();
        builder.Services.AddScoped<AssignPlanToTenantHandler>();
        builder.Services.AddScoped<IValidator<UpdateTenantCommand>, UpdateTenantValidator>();
        builder.Services.AddScoped<UpdateTenantHandler>();
        builder.Services.AddScoped<DeleteTenantHandler>();
        builder.Services.AddScoped<ResetTenantAdminPasswordHandler>();
        builder.Services.AddScoped<SetTenantTrialHandler>();
        builder.Services.AddScoped<GetTenantRolePermissionsHandler>();
        builder.Services.AddScoped<UpdateTenantRolePermissionsHandler>();
        builder.Services.AddHostedService<TrialExpiryCheckService>();

        builder.Services.AddScoped<GetPlatformSettingsHandler>();
        builder.Services.AddScoped<IValidator<UpdatePlatformSettingsCommand>, UpdatePlatformSettingsValidator>();
        builder.Services.AddScoped<UpdatePlatformSettingsHandler>();
        builder.Services.AddScoped<GetEmailConnectionStatusHandler>();
        builder.Services.AddScoped<GetEmailSummaryHandler>();

        builder.Services.AddScoped<IValidator<CreatePlanCommand>, CreatePlanValidator>();
        builder.Services.AddScoped<CreatePlanHandler>();
        builder.Services.AddScoped<IValidator<UpdatePlanCommand>, UpdatePlanValidator>();
        builder.Services.AddScoped<UpdatePlanHandler>();
        builder.Services.AddScoped<DeletePlanHandler>();
        builder.Services.AddScoped<ListPlansHandler>();

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

        var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
            ?? throw new InvalidOperationException("Missing \"Jwt\" configuration section.");
        builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
        builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtSettings.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SigningKey)),
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
            var dbContext = scope.ServiceProvider.GetRequiredService<UserDbContext>();
            dbContext.Database.Migrate();

            // One-time bootstrap so the Super-Admin-only Tenants API (Phase 1
            // manual tenant provisioning) is reachable by someone without
            // hand-editing the database - there is no other way to become
            // the first Super Admin. Dev/local-only credential; a real
            // deployment should rotate this immediately (MustChangePassword
            // already forces that on first login).
            if (!dbContext.Users.Any(u => u.Role == UserRole.SuperAdmin))
            {
                var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
                var bootstrapAdmin = new AppUser
                {
                    TenantId = TenantConstants.PlatformTenantId,
                    FullName = "Platform Super Admin",
                    Email = "superadmin@examvault.local",
                    Role = UserRole.SuperAdmin,
                    IsActive = true,
                    MustChangePassword = true,
                };
                bootstrapAdmin.PasswordHash = passwordHasher.HashPassword(bootstrapAdmin, "ChangeMe123!");
                dbContext.Users.Add(bootstrapAdmin);
                dbContext.SaveChanges();
            }
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
                    .LogError(exception, "Unhandled exception in User Service.");
                await ReportSystemErrorAsync(context, exception, "User Service");
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
