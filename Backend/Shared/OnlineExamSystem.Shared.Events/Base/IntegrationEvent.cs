namespace OnlineExamSystem.Shared.Events.Base;

public abstract record IntegrationEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTime OccurredAtUtc { get; init; } = DateTime.UtcNow;

    // Not required: most event types predate multi-tenancy and don't need
    // it yet. Set explicitly by publishers whose consumers write into a
    // tenant-scoped table with no other way to know which tenant - see
    // UserRegisteredEvent/ExamAssignedEvent/ExamReminderDueEvent/
    // CodeAnswerSubmittedEvent.
    public Guid TenantId { get; init; }
}
