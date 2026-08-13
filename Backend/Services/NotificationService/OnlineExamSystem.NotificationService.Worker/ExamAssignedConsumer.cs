using System.Text.Json;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Events.Exam;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace OnlineExamSystem.NotificationService.Worker;

public class ExamAssignedConsumer : BackgroundService
{
    private const string QueueName = "notification-service.exam-assigned-events";

    private readonly RabbitMqSettings _settings;
    private readonly ILogger<ExamAssignedConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ExamAssignedConsumer(
        IOptions<RabbitMqSettings> settings,
        ILogger<ExamAssignedConsumer> logger,
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
            if (eventArgs.BasicProperties.Type != nameof(ExamAssignedEvent))
            {
                return;
            }

            var examAssigned = JsonSerializer.Deserialize<ExamAssignedEvent>(eventArgs.Body.Span);
            if (examAssigned is null || examAssigned.Targets.Count == 0)
            {
                return;
            }

            _logger.LogInformation(
                "ExamAssignedEvent received: ExamId={ExamId}, ExamTitle={ExamTitle}, TargetCount={TargetCount}",
                examAssigned.ExamId, examAssigned.ExamTitle, examAssigned.Targets.Count);

            using var scope = _scopeFactory.CreateScope();
            var persistenceService = scope.ServiceProvider.GetRequiredService<INotificationPersistenceService>();

            var recipients = examAssigned.Targets
                .Select(t => new NotificationRecipient(t.UserId, t.Email, t.FullName))
                .ToList();

            await persistenceService.CreateNotificationsAsync(
                batchId: Guid.NewGuid(),
                recipients: recipients,
                type: NotificationType.Exam,
                title: $"New Exam Assigned: {examAssigned.ExamTitle}",
                message: $"You've been assigned to \"{examAssigned.ExamTitle}\". Please check your exams list for details.",
                relatedExamId: examAssigned.ExamId,
                cancellationToken: stoppingToken);
        };

        await channel.BasicConsumeAsync(queue.QueueName, autoAck: true, consumer, cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
