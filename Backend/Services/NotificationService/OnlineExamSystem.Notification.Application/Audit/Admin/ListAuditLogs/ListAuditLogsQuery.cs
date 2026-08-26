using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.Audit.Admin.ListAuditLogs;

public record ListAuditLogsQuery(DateTime FromUtc, DateTime ToUtc, AuditModule? Module, Guid? UserId);
