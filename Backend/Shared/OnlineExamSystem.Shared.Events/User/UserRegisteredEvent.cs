using OnlineExamSystem.Shared.Events.Base;

namespace OnlineExamSystem.Shared.Events.User;

public sealed record UserRegisteredEvent : IntegrationEvent
{
    public required Guid UserId { get; init; }
    public required string Email { get; init; }
    public required string FullName { get; init; }
}
