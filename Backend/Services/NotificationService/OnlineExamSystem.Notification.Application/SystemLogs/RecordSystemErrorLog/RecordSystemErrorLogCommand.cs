using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.SystemLogs.RecordSystemErrorLog;

public record RecordSystemErrorLogCommand(
    string Service,
    SystemLogLevel Severity,
    string Message,
    string? ExceptionType,
    string? StackTrace,
    string? RequestPath,
    string? RequestMethod,
    Guid? TenantId);
