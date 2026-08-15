using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Infrastructure.Email;
using OnlineExamSystem.Notification.Infrastructure.Persistence;
using OnlineExamSystem.NotificationService.Worker;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
builder.Services.Configure<N8nSettings>(builder.Configuration.GetSection("N8n"));

builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("NotificationDb")));
builder.Services.AddHttpClient<IEmailDispatcher, N8nEmailDispatcher>();
builder.Services.AddScoped<INotificationPersistenceService, NotificationPersistenceService>();

builder.Services.AddHostedService<UserRegisteredConsumer>();
builder.Services.AddHostedService<ExamAssignedConsumer>();
builder.Services.AddHostedService<ExamReminderConsumer>();

var host = builder.Build();

using (var scope = host.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<NotificationDbContext>().Database.Migrate();
}

host.Run();
