using OnlineExamSystem.Shared.Events.Base;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Submission.Application.Tests.Fakes;

public class FakeEventPublisher : IEventPublisher
{
    private readonly List<IntegrationEvent> _published = [];

    public IReadOnlyList<IntegrationEvent> Published => _published;

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent
    {
        _published.Add(@event);
        return Task.CompletedTask;
    }
}
