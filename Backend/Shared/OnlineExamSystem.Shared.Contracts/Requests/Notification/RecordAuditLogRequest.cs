namespace OnlineExamSystem.Shared.Contracts.Requests.Notification;

// Module is one of "Auth","Users","Exams","Questions","Results","Security"
// (AuditModule enum, sent as string across the service boundary like every
// other enum in this codebase's contracts). IpAddress is captured by the
// CALLING service from its own HttpContext, not resolved here.
//
// TenantId is likewise resolved and passed by the CALLING service, not this
// one: this endpoint is deliberately unauthenticated (see AuditLogsController's
// own comment - called before any JWT exists during login, among other cases),
// so there is no ambient tenant to read here the way every other tenant-scoped
// write in this codebase relies on.
public record RecordAuditLogRequest(
    Guid TenantId,
    string Module,
    string Activity,
    string? Details,
    string? EntityId,
    Guid? UserId,
    string? UserName,
    string? IpAddress,
    bool IsSuperAdminActor = false);
