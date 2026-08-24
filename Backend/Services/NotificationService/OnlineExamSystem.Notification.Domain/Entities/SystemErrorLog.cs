using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Notification.Domain.Entities;

// Extends BaseEntity directly (NOT TenantScopedEntity, unlike AuditLog) - an
// unhandled exception may have no tenant at all (a pre-auth failure, a
// Gateway-level error), and Super Admin must see every row regardless of
// tenant, so no per-tenant query filter belongs here.
public class SystemErrorLog : BaseEntity
{
    public required string Service { get; set; }
    public SystemLogLevel Severity { get; set; }
    public required string Message { get; set; }
    public string? ExceptionType { get; set; }
    public string? StackTrace { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public Guid? TenantId { get; set; }
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public Guid? ResolvedByUserId { get; set; }
}
