using System.Text.Json;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Events.Exam;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace OnlineExamSystem.NotificationService.Worker;

public class ExamReminderConsumer : BackgroundService
{
    private const string QueueName = "notification-service.exam-reminder-events";

    private readonly RabbitMqSettings _settings;
    private readonly ILogger<ExamReminderConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ExamReminderConsumer(
        IOptions<RabbitMqSettings> settings,
        ILogger<ExamReminderConsumer> logger,
        IServiceScopeFactory scopeFactory)
    {
        _settings = settings.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _settings.HostName,
            Port = _settings.Port,
            UserName = _settings.UserName,
            Password = _settings.Password,
        };

        await using var connection = await factory.CreateConnectionAsync(stoppingToken);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);

        await channel.ExchangeDeclareAsync(
            _settings.ExchangeName, ExchangeType.Fanout, durable: true, cancellationToken: stoppingToken);
        var queue = await channel.QueueDeclareAsync(
            QueueName, durable: true, exclusive: false, autoDelete: false, cancellationToken: stoppingToken);
        await channel.QueueBindAsync(
            queue.QueueName, _settings.ExchangeName, routingKey: string.Empty, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, eventArgs) =>
        {
            if (eventArgs.BasicProperties.Type != nameof(ExamReminderDueEvent))
            {
                return;
            }

            var reminder = JsonSerializer.Deserialize<ExamReminderDueEvent>(eventArgs.Body.Span);
            if (reminder is null || reminder.Targets.Count == 0)
            {
                return;
            }

            _logger.LogInformation(
                "ExamReminderDueEvent received: ExamId={ExamId}, AssignmentId={AssignmentId}, Window={Window}, TargetCount={TargetCount}",
                reminder.ExamId, reminder.AssignmentId, reminder.Window, reminder.Targets.Count);

            using var scope = _scopeFactory.CreateScope();
            var persistenceService = scope.ServiceProvider.GetRequiredService<INotificationPersistenceService>();

            var recipients = reminder.Targets
                .Select(t => new NotificationRecipient(t.UserId, t.Email, t.FullName))
                .ToList();

            var windowText = reminder.Window == ReminderWindow.TwentyFourHour ? "24 hours" : "1 hour";

            await persistenceService.CreateNotificationsAsync(
                tenantId: reminder.TenantId,
                batchId: Guid.NewGuid(),
                recipients: recipients,
                type: NotificationType.Reminder,
                title: $"Exam Reminder: {reminder.ExamTitle}",
                message: $"Your exam \"{reminder.ExamTitle}\" starts in {windowText}. Please make sure you're ready to begin on time.",
                relatedExamId: reminder.ExamId,
                cancellationToken: stoppingToken);
        };

        await channel.BasicConsumeAsync(queue.QueueName, autoAck: true, consumer, cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
