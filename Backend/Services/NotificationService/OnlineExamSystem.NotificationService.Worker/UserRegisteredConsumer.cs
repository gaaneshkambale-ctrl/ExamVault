using System.Text.Json;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Events.User;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace OnlineExamSystem.NotificationService.Worker;

public class UserRegisteredConsumer : BackgroundService
{
    private readonly RabbitMqSettings _settings;
    private readonly ILogger<UserRegisteredConsumer> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserRegisteredConsumer(
        IOptions<RabbitMqSettings> settings,
        ILogger<UserRegisteredConsumer> logger,
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
            _settings.QueueName, durable: true, exclusive: false, autoDelete: false, cancellationToken: stoppingToken);
        await channel.QueueBindAsync(
            queue.QueueName, _settings.ExchangeName, routingKey: string.Empty, cancellationToken: stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, eventArgs) =>
        {
            if (eventArgs.BasicProperties.Type != nameof(UserRegisteredEvent))
            {
                return;
            }

            var userRegistered = JsonSerializer.Deserialize<UserRegisteredEvent>(eventArgs.Body.Span);
            if (userRegistered is null)
            {
                return;
            }

            _logger.LogInformation(
                "UserRegisteredEvent received: UserId={UserId}, Email={Email}, FullName={FullName}",
                userRegistered.UserId, userRegistered.Email, userRegistered.FullName);

            using var scope = _scopeFactory.CreateScope();
            var persistenceService = scope.ServiceProvider.GetRequiredService<INotificationPersistenceService>();

            await persistenceService.CreateNotificationsAsync(
                batchId: Guid.NewGuid(),
                recipients: [new NotificationRecipient(userRegistered.UserId, userRegistered.Email, userRegistered.FullName)],
                type: NotificationType.Account,
                title: "Welcome to ExamVault!",
                message: $"Hello {userRegistered.FullName}, welcome to ExamVault! Your account has been created successfully.",
                cancellationToken: stoppingToken);
        };

        await channel.BasicConsumeAsync(queue.QueueName, autoAck: true, consumer, cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
