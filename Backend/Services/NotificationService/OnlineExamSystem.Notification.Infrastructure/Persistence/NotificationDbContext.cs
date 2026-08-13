using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using OnlineExamSystem.Notification.Domain.Entities;
using NotificationEntity = OnlineExamSystem.Notification.Domain.Entities.Notification;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class NotificationDbContext : DbContext
{
    public NotificationDbContext(DbContextOptions<NotificationDbContext> options) : base(options)
    {
    }

    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();

    // SQL Server's datetime2 columns don't preserve DateTimeKind, so EF Core
    // reads every DateTime back as Kind=Unspecified. Forcing Kind=Utc on
    // every read keeps every DateTime in this context honestly UTC end to
    // end, the same fix Submission Service needed for its attempt timers.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NotificationEntity>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.HasIndex(n => new { n.UserId, n.CreatedAtUtc });
            entity.HasIndex(n => n.BatchId);
            entity.Property(n => n.Type).HasConversion<string>();
            entity.Property(n => n.EmailStatus).HasConversion<string>();
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => new { p.UserId, p.Type }).IsUnique();
            entity.Property(p => p.Type).HasConversion<string>();
        });
    }
}

public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    {
    }
}

public class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableUtcDateTimeConverter()
        : base(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v)
    {
    }
}
