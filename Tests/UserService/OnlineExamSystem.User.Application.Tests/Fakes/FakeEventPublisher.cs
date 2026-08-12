using OnlineExamSystem.Shared.Events.Base;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.User.Application.Tests.Fakes;

public class FakeEventPublisher : IEventPublisher
{
    private readonly List<IntegrationEvent> _publishedEvents = [];

    public IReadOnlyList<IntegrationEvent> PublishedEvents => _publishedEvents;

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent
    {
        _publishedEvents.Add(@event);
        return Task.CompletedTask;
    }
}
