using OnlineExamSystem.Shared.Events.Base;

namespace OnlineExamSystem.Shared.Events.Publishing;

public interface IEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent;
}
