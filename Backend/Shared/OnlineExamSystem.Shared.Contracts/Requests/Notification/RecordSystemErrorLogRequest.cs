namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

// Severity is "Warning" or "Error" (SystemLogLevel enum, sent as string
// across the service boundary like every other enum in this codebase's
// contracts). TenantId/RequestPath/RequestMethod are captured by the
// CALLING service from its own HttpContext, not resolved here - this
// endpoint is deliberately unauthenticated (same reasoning as
// RecordAuditLogRequest), so there is no ambient context to read.
public record RecordSystemErrorLogRequest(
    string Service,
    string Severity,
    string Message,
    string? ExceptionType,
    string? StackTrace,
    string? RequestPath,
    string? RequestMethod,
    Guid? TenantId);
