namespace OnlineExamSystem.Shared.Contracts.Responses.Notification;

public record AuditLogResponse(
    Guid Id,
    DateTime TimestampUtc,
    string Module,
    string Activity,
    string? Details,
    string? EntityId,
    Guid? UserId,
    string? UserName,
    string? IpAddress,
    // Only meaningful to a Super Admin caller (the query filter's
    // IsSuperAdmin bypass only returns other tenants' logs to them) - a
    // regular Admin's own Audit Reports view is always their own tenant
    // already, so that page has no reason to render it.
    Guid TenantId = default);
