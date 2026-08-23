using OnlineExamSystem.Shared.Common.Entities;

namespace OnlineExamSystem.Shared.Common.Multitenancy;

// Entities that belong to exactly one tenant inherit this instead of bare
// BaseEntity - every service's DbContext applies a global query filter to
// every TenantScopedEntity (see ICurrentTenant), so a repository cannot
// accidentally return another tenant's rows just by forgetting a .Where.
//
// A few entities deliberately do NOT inherit this even though they're
// tenant-adjacent: User Service's Tenant itself (a tenant doesn't belong to
// a tenant), RefreshToken/UserPreferences (scoped via their owning AppUser,
// per Phase 1), and AppUser itself (Login/Register run before any tenant
// context exists - see UserDbContext's own comment on why AppUser keeps its
// TenantId column but is deliberately NOT filtered).
public abstract class TenantScopedEntity : BaseEntity
{
    public Guid TenantId { get; set; }
}
