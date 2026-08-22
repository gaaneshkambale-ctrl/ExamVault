using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Infrastructure.Persistence;

public class UserDbContext : DbContext
{
    public UserDbContext(DbContextOptions<UserDbContext> options) : base(options)
    {
    }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(200);
            entity.Property(u => u.RollNumber).HasMaxLength(40);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.HasIndex(u => u.Email).IsUnique();
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
            entity.HasIndex(u => u.UserNumber).IsUnique();
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
            entity.HasIndex(g => g.Name).IsUnique();
        });

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
