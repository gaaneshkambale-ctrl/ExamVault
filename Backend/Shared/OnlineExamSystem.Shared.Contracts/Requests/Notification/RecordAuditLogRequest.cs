namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

// Module is one of "Auth","Users","Exams","Questions","Results","Security"
// (AuditModule enum, sent as string across the service boundary like every
// other enum in this codebase's contracts). IpAddress is captured by the
// CALLING service from its own HttpContext, not resolved here.
public record RecordAuditLogRequest(
    string Module,
    string Activity,
    string? Details,
    string? EntityId,
    Guid? UserId,
    string? UserName,
    string? IpAddress);
