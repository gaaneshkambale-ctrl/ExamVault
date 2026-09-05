using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Options;
using OnlineExamSystem.Shared.Events.Base;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Submission.Infrastructure.Messaging;

public class ServiceBusEventPublisher : IEventPublisher, IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSender _sender;

    public ServiceBusEventPublisher(IOptions<ServiceBusSettings> settings)
    {
        var options = settings.Value;
        _client = new ServiceBusClient(options.ConnectionString);
        _sender = _client.CreateSender(options.TopicName);
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent
    {
        var message = new ServiceBusMessage(JsonSerializer.SerializeToUtf8Bytes(@event))
        {
            ContentType = "application/json",
        };
        message.ApplicationProperties["Type"] = typeof(TEvent).Name;

        await _sender.SendMessageAsync(message, cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        await _sender.DisposeAsync();
        await _client.DisposeAsync();
    }
}
