using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Application.Notifications.Admin.CreateNotification;
using OnlineExamSystem.Notification.Application.Notifications.Admin.DeleteNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationBatchDetails;
using OnlineExamSystem.Notification.Application.Notifications.Admin.GetNotificationHistory;
using OnlineExamSystem.Notification.Application.Notifications.Admin.ResendNotificationBatch;
using OnlineExamSystem.Notification.Application.Notifications.Mine.DeleteMyNotification;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetMyNotifications;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetNotificationById;
using OnlineExamSystem.Notification.Application.Notifications.Mine.GetUnreadCount;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAllAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.MarkAsRead;
using OnlineExamSystem.Notification.Application.Notifications.Mine.Preferences;
using OnlineExamSystem.Notification.Infrastructure.Clients;
using OnlineExamSystem.Notification.Infrastructure.Email;
using OnlineExamSystem.Notification.Infrastructure.Persistence;

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

        builder.Services.AddDbContext<NotificationDbContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("NotificationDb")));
        builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

        builder.Services.Configure<N8nSettings>(builder.Configuration.GetSection("N8n"));
        builder.Services.AddHttpClient<IEmailDispatcher, N8nEmailDispatcher>();
        builder.Services.AddScoped<INotificationPersistenceService, NotificationPersistenceService>();

        var userServiceBaseUrl = builder.Configuration["Services:UserServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:UserServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IUserDirectoryClient, UserDirectoryClient>(client =>
            client.BaseAddress = new Uri(userServiceBaseUrl));

        var examServiceBaseUrl = builder.Configuration["Services:ExamServiceBaseUrl"]
            ?? throw new InvalidOperationException("Missing \"Services:ExamServiceBaseUrl\" configuration.");
        builder.Services.AddHttpClient<IExamAssignmentLookupClient, ExamAssignmentLookupClient>(client =>
            client.BaseAddress = new Uri(examServiceBaseUrl));

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
        builder.Services.AddScoped<GetNotificationBatchDetailsHandler>();
        builder.Services.AddScoped<ResendNotificationBatchHandler>();
        builder.Services.AddScoped<DeleteNotificationBatchHandler>();

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

        app.UseHttpsRedirection();

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.Run();
    }
}
