using System.Text.Json;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Shared.Events.Base;
using OnlineExamSystem.Shared.Events.Publishing;
using RabbitMQ.Client;

namespace OnlineExamSystem.User.Infrastructure.Messaging;

public class RabbitMqEventPublisher : IEventPublisher, IAsyncDisposable
{
    private readonly RabbitMqSettings _settings;
    private readonly Task<IConnection> _connectionTask;

    public RabbitMqEventPublisher(IOptions<RabbitMqSettings> settings)
    {
        _settings = settings.Value;
        var factory = new ConnectionFactory
        {
            HostName = _settings.HostName,
            Port = _settings.Port,
            UserName = _settings.UserName,
            Password = _settings.Password,
        };
        _connectionTask = factory.CreateConnectionAsync();
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent
    {
        var connection = await _connectionTask;
        await using var channel = await connection.CreateChannelAsync(cancellationToken: cancellationToken);

        await channel.ExchangeDeclareAsync(
            _settings.ExchangeName,
            ExchangeType.Fanout,
            durable: true,
            cancellationToken: cancellationToken);

        var properties = new BasicProperties
        {
            ContentType = "application/json",
            Type = typeof(TEvent).Name,
            Persistent = true,
        };

        var body = JsonSerializer.SerializeToUtf8Bytes(@event);
        await channel.BasicPublishAsync(
            _settings.ExchangeName,
            routingKey: string.Empty,
            mandatory: false,
            basicProperties: properties,
            body: body,
            cancellationToken: cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        var connection = await _connectionTask;
        await connection.DisposeAsync();
    }
}
