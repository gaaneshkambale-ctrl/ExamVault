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
}
