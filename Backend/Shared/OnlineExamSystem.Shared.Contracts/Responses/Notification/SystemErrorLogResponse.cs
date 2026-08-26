namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record SystemErrorLogResponse(
    Guid Id,
    DateTime TimestampUtc,
    string Service,
    string Severity,
    string Message,
    string? ExceptionType,
    string? StackTrace,
    string? RequestPath,
    string? RequestMethod,
    Guid? TenantId,
    bool IsResolved,
    DateTime? ResolvedAtUtc,
    Guid? ResolvedByUserId);
