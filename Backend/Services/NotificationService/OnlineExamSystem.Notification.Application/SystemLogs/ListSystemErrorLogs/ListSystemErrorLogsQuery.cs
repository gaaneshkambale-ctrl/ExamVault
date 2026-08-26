using OnlineExamSystem.Notification.Domain.Enums;

namespace OnlineExamSystem.Notification.Application.SystemLogs.ListSystemErrorLogs;

public record ListSystemErrorLogsQuery(
    DateTime FromUtc,
    DateTime ToUtc,
    string? Service,
    SystemLogLevel? Severity,
    bool? IsResolved);
