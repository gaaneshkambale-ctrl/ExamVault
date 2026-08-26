using Microsoft.EntityFrameworkCore;

namespace OnlineExamSystem.Shared.Common.Multitenancy;

// Base for every service's DbContext except User Service's (which needs its
// own hand-rolled AppUser exception - see UserDbContext's own comment).
// Stamps TenantId onto every newly-added TenantScopedEntity from the
// current request's JWT claim before it's saved, so a handler that
// constructs `new Foo { ... }` never has to remember to set TenantId
// itself - the same "don't rely on someone remembering it" reasoning as the
// HasQueryFilter guardrail each derived context adds for reads.
public abstract class TenantScopedDbContext : DbContext
{
    protected readonly ICurrentTenant CurrentTenant;

    protected TenantScopedDbContext(DbContextOptions options, ICurrentTenant currentTenant) : base(options)
    {
        CurrentTenant = currentTenant;
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampTenantId();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampTenantId();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void StampTenantId()
    {
        foreach (var entry in ChangeTracker.Entries<TenantScopedEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
            {
                entry.Entity.TenantId = CurrentTenant.TenantId;
            }
        }
    }
}
