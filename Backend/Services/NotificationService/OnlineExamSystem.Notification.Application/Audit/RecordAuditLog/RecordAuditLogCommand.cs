using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Audit.RecordAuditLog;

public record RecordAuditLogCommand(
    AuditModule Module,
    string Activity,
    string? Details,
    string? EntityId,
    Guid? UserId,
    string? UserName,
    string? IpAddress);
