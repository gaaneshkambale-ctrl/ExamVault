using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Audit.RecordAuditLog;

public record RecordAuditLogCommand(
    Guid TenantId,
    AuditModule Module,
    string Activity,
    string? Details,
    string? EntityId,
    Guid? UserId,
    string? UserName,
    string? IpAddress,
    bool IsSuperAdminActor = false);
