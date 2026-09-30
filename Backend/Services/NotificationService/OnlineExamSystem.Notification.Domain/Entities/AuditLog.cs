using OnlineExamSystem.Notification.Domain.Enums;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.Domain.Entities;

// Id + CreatedAtUtc (the write timestamp, used as this row's "when") come
// from BaseEntity. IpAddress is captured by the WRITING service from its
// own HttpContext, not derived here - a service-to-service call would
// otherwise report the calling container's IP, not the real client's.
// TenantId is likewise passed explicitly by the writer (see
// RecordAuditLogRequest's own comment) - this endpoint is deliberately
// unauthenticated so there's no ambient tenant to stamp it from.
public class AuditLog : TenantScopedEntity
{
    public AuditModule Module { get; set; }
    public required string Activity { get; set; }
    public string? Details { get; set; }
    public string? EntityId { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }

    // True only for the handful of Platform Admin console actions where a
    // SuperAdmin acts ON another org (TenantsController.RecordSecurityEventAsync -
    // deactivate/reactivate/delete org, assign plan, admin password reset,
    // trial/role-permission changes). AuditLogsController's tenant-facing
    // List endpoint uses this to mask the real actor identity from that
    // org's own Admin - they shouldn't see which platform staff member (or
    // that staff exists at all) touched their account, even though the
    // event itself legitimately belongs to their tenant's audit trail.
    public bool IsSuperAdminActor { get; set; }
}
