namespace OnlineExamSystem.Shared.Common.Multitenancy;

// Implemented once per service (same "per-service copy" convention already
// used for RabbitMQ publishers) reading the tenant_id/role claims off the
// current request's already-validated JWT - every service already does its
// own AddJwtBearer against the same shared signing key, so this is just
// reading claims that are already there.
public interface ICurrentTenant
{
    // False for a request with no authenticated caller at all - e.g. a
    // background-job-triggered internal endpoint with no JWT to forward
    // (see User Service's InternalController). Every TenantScopedEntity's
    // query filter treats "not authenticated" as "see nothing", never as
    // "see everything" - an internal endpoint that legitimately needs
    // cross-tenant access must query a non-tenant-scoped entity by explicit
    // id, not rely on ambient tenant context that doesn't exist.
    bool IsAuthenticated { get; }
    Guid TenantId { get; }

    // Super Admin manages tenants themselves rather than belonging to one
    // being managed - the query filter lets them see every tenant's rows
    // rather than being scoped to their own reserved Platform tenant.
    bool IsSuperAdmin { get; }
}
