namespace OnlineExamSystem.User.Application.Interfaces;

// Fire-and-forget audit logging: implementations must never throw - a
// down/unreachable NotificationService must never fail the real operation
// (login, user update) that triggered the audit entry.
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
        bool isSuperAdminActor = false,
        CancellationToken cancellationToken = default);
}
