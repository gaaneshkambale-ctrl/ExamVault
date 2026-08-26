using OnlineExamSystem.Shared.Events.Base;
using OnlineExamSystem.Shared.Events.Publishing;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeEventPublisher : IEventPublisher
{
    public List<IntegrationEvent> PublishedEvents { get; } = [];
    public bool ShouldThrow { get; init; }

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IntegrationEvent
    {
        if (ShouldThrow)
        {
            throw new InvalidOperationException("Simulated broker failure.");
        }

        PublishedEvents.Add(@event);
        return Task.CompletedTask;
    }
}
