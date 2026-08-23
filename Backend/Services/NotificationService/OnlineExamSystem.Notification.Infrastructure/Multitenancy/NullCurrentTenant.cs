using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Notification.Infrastructure.Multitenancy;

// For the Notification Worker (OnlineExamSystem.NotificationService.Worker) -
// a background process with no HttpContext/JWT to back HttpContextCurrentTenant,
// so NotificationDbContext (which requires an ICurrentTenant to even be
// constructed) needs a different implementation here. Always
// IsAuthenticated=false, matching ICurrentTenant's own documented contract:
// every TenantScopedEntity query filter then returns zero rows rather than
// "everything", so an accidental ambient-scoped read in the worker fails
// safe instead of leaking cross-tenant data.
//
// This is safe for the worker's actual persistence path: every write goes
// through NotificationPersistenceService.CreateNotificationsAsync, which
// always sets TenantId explicitly per entity (from the triggering event's
// own TenantId, e.g. ExamAssignedEvent.TenantId) rather than relying on this
// stamp, and its one read already uses IgnoreQueryFilters() + an explicit
// tenantId - see that method's own comment. Nothing in the worker's
// consumers relies on this class ever returning a real tenant.
public class NullCurrentTenant : ICurrentTenant
{
    public bool IsAuthenticated => false;
    public Guid TenantId => Guid.Empty;
    public bool IsSuperAdmin => false;
}
