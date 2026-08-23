using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Infrastructure.Persistence;

public class UserDbContext : DbContext
{
    private readonly ICurrentTenant _currentTenant;

    public UserDbContext(DbContextOptions<UserDbContext> options, ICurrentTenant currentTenant) : base(options)
    {
        _currentTenant = currentTenant;
    }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(200);
            entity.Property(t => t.Slug).IsRequired().HasMaxLength(100);
            entity.HasIndex(t => t.Slug).IsUnique();
            entity.Property(t => t.IsActive).HasDefaultValue(true);

            // Seeded so every pre-multi-tenancy row (Default) and every
            // future Super Admin (Platform) has a real tenant to belong to
            // from the moment this migration runs.
            entity.HasData(
                new Tenant
                {
                    Id = TenantConstants.DefaultTenantId,
                    Name = TenantConstants.DefaultTenantName,
                    Slug = TenantConstants.DefaultTenantSlug,
                    IsActive = true,
                    CreatedAtUtc = new DateTime(2026, 8, 23, 0, 0, 0, DateTimeKind.Utc),
                },
                new Tenant
                {
                    Id = TenantConstants.PlatformTenantId,
                    Name = TenantConstants.PlatformTenantName,
                    Slug = TenantConstants.PlatformTenantSlug,
                    IsActive = true,
                    CreatedAtUtc = new DateTime(2026, 8, 23, 0, 0, 0, DateTimeKind.Utc),
                });
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(200);
            entity.Property(u => u.RollNumber).HasMaxLength(40);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            // Uniqueness is per-tenant, not global - two different tenants
            // can each have their own "admin@gmail.com".
            entity.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.IsActive).HasDefaultValue(true);
            entity.Property(u => u.PhoneNumber).HasMaxLength(20);
            entity.Property(u => u.PhotoContentType).HasMaxLength(100);
            entity.Property(u => u.Username).HasMaxLength(100);
            entity.Property(u => u.AlternateEmail).HasMaxLength(256);
            entity.Property(u => u.Gender).HasConversion<string>();
            entity.Property(u => u.Location).HasMaxLength(200);
            entity.Property(u => u.Department).HasMaxLength(100);
            entity.Property(u => u.UserNumber).UseIdentityColumn();
            entity.HasIndex(u => new { u.TenantId, u.UserNumber }).IsUnique();
            entity.HasOne<Tenant>()
                .WithMany()
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.TokenHash).IsRequired().HasMaxLength(256);
            entity.Property(t => t.DeviceLabel).HasMaxLength(100);
            entity.Property(t => t.IpAddress).HasMaxLength(64);
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasOne<AppUser>()
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserPreferences>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.UserId).IsUnique();
            entity.Property(p => p.Language).HasMaxLength(100);
            entity.Property(p => p.Timezone).HasMaxLength(100);
            entity.Property(p => p.DateFormat).HasMaxLength(50);
            entity.Property(p => p.TimeFormat).HasConversion<string>();
            entity.Property(p => p.Theme).HasConversion<string>();
        });

        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.Property(g => g.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(g => new { g.TenantId, g.Name }).IsUnique();
            entity.HasOne<Tenant>()
                .WithMany()
                .HasForeignKey(g => g.TenantId)
                .OnDelete(DeleteBehavior.Restrict);

            // The guardrail: unlike AppUser (see its own comment), Group is
            // only ever touched by an authenticated Admin, so it's safe to
            // filter every query down to the caller's own tenant here -
            // Super Admin sees every tenant's groups, an unauthenticated
            // caller sees none, a Tenant Admin sees only their own.
            entity.HasQueryFilter(g =>
                _currentTenant.IsSuperAdmin || (_currentTenant.IsAuthenticated && g.TenantId == _currentTenant.TenantId));
        });

        // GroupMember has no TenantId of its own - scoped transitively via
        // its GroupId (the same "via the owner" pattern as RefreshToken and
        // UserPreferences above), which is already filtered.
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.HasIndex(m => new { m.GroupId, m.UserId }).IsUnique();
            entity.HasOne<Group>()
                .WithMany()
                .HasForeignKey(m => m.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
