namespace OnlineExamSystem.Submission.Application.Interfaces;

// Fire-and-forget audit logging: implementations must never throw - a
// down/unreachable NotificationService must never fail the real operation
// (start/submit an exam attempt) that triggered the audit entry.
public interface IAuditClient
{
    Task RecordAsync(
        Guid tenantId,
        string module,
        string activity,
        string? details,
        string? entityId,
        Guid? userId,
        string? userName,
        string? ipAddress,
        CancellationToken cancellationToken = default);
}
