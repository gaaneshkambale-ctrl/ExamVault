using System.Text.Json;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Shared.Events.User;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace OnlineExamSystem.NotificationService.Worker;

public class UserRegisteredConsumer : BackgroundService
{
    private readonly RabbitMqSettings _settings;
    private readonly ILogger<UserRegisteredConsumer> _logger;

    public UserRegisteredConsumer(IOptions<RabbitMqSettings> settings, ILogger<UserRegisteredConsumer> logger)
    {
        _settings = settings.Value;
        _logger = logger;
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
        consumer.ReceivedAsync += (_, eventArgs) =>
        {
            if (eventArgs.BasicProperties.Type == nameof(UserRegisteredEvent))
            {
                var userRegistered = JsonSerializer.Deserialize<UserRegisteredEvent>(eventArgs.Body.Span);
                _logger.LogInformation(
                    "UserRegisteredEvent received: UserId={UserId}, Email={Email}, FullName={FullName}",
                    userRegistered?.UserId, userRegistered?.Email, userRegistered?.FullName);
            }

            return Task.CompletedTask;
        };

        await channel.BasicConsumeAsync(queue.QueueName, autoAck: true, consumer, cancellationToken: stoppingToken);

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }
}
