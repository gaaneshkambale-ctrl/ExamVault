using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Infrastructure.Email;
using OnlineExamSystem.Notification.Infrastructure.Multitenancy;
using OnlineExamSystem.Notification.Infrastructure.Persistence;
using OnlineExamSystem.NotificationService.Worker;
using OnlineExamSystem.Shared.Common.Multitenancy;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<N8nSettings>(builder.Configuration.GetSection("N8n"));

builder.Services.AddScoped<ICurrentTenant, NullCurrentTenant>();
builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("NotificationDb"),
        // Same transient-failure resiliency as every other service's
        // DbContext registration - see ExamService's Program.cs for the
        // real incident that prompted this across all of them. Especially
        // relevant here: this Worker runs its own background polling loop,
        // same shape as ExamReminderCheckService.
        sqlOptions => sqlOptions.EnableRetryOnFailure()));
builder.Services.AddHttpClient<IEmailDispatcher, N8nEmailDispatcher>();
builder.Services.AddScoped<INotificationPersistenceService, NotificationPersistenceService>();

if (builder.Configuration["Messaging:Provider"] == "ServiceBus")
{
    builder.Services.Configure<ServiceBusSettings>(builder.Configuration.GetSection("ServiceBus"));
    builder.Services.AddHostedService<ServiceBusUserRegisteredConsumer>();
    builder.Services.AddHostedService<ServiceBusExamAssignedConsumer>();
    builder.Services.AddHostedService<ServiceBusExamReminderConsumer>();
}
else
{
    builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMq"));
    builder.Services.AddHostedService<UserRegisteredConsumer>();
    builder.Services.AddHostedService<ExamAssignedConsumer>();
    builder.Services.AddHostedService<ExamReminderConsumer>();
}

var host = builder.Build();

using (var scope = host.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<NotificationDbContext>().Database.Migrate();
}

host.Run();
