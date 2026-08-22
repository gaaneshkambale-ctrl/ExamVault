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
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<NotificationTemplate> NotificationTemplates => Set<NotificationTemplate>();
    public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();

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
            entity.Property(n => n.ShowInApp).HasDefaultValue(true);
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => new { p.UserId, p.Type }).IsUnique();
            entity.Property(p => p.Type).HasConversion<string>();
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => a.CreatedAtUtc);
            entity.HasIndex(a => a.Module);
            entity.HasIndex(a => a.UserId);
            entity.Property(a => a.Module).HasConversion<string>();
            entity.Property(a => a.Activity).HasMaxLength(200);
            entity.Property(a => a.UserName).HasMaxLength(200);
            entity.Property(a => a.IpAddress).HasMaxLength(64);
        });

        modelBuilder.Entity<NotificationTemplate>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Type).HasConversion<string>();
            entity.Property(t => t.Name).HasMaxLength(200);
            entity.Property(t => t.Subject).HasMaxLength(300);
            entity.HasData(NotificationTemplateSeed.Templates);
        });

        modelBuilder.Entity<SystemSettings>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.BackupFrequency).HasConversion<string>();
            entity.Property(s => s.LogLevel).HasConversion<string>();
        });
    }
}

// Migrates the 5 templates that already existed for real as the hardcoded
// Frontend notificationTemplates.ts array, so switching Send Notification's
// dropdown over to the backend doesn't lose default-template availability.
// Timestamps are the fixed real date this migration was authored (NOT the
// notification_templates.png mockup's illustrative per-row dates - backdating
// these would be fabricating an audit trail).
public static class NotificationTemplateSeed
{
    private static readonly DateTime SeededAtUtc = new(2026, 8, 22, 12, 0, 0, DateTimeKind.Utc);

    public static readonly NotificationTemplate[] Templates =
    [
        new NotificationTemplate
        {
            Id = Guid.Parse("11111111-1111-4111-8111-111111111101"),
            Name = "Exam Assigned",
            Type = OnlineExamSystem.Notification.Domain.Enums.NotificationType.Exam,
            SendEmail = true,
            SendInApp = true,
            Subject = "Your {{examTitle}} Exam is Assigned",
            Body = "Hello {{studentName}},\n\n" +
                   "You have been assigned the {{examTitle}}.\n" +
                   "Please log in to ExamVault to view your exam schedule.\n\n" +
                   "Exam Date: {{startDate}}   Duration: {{duration}}",
            IsActive = true,
            CreatedAtUtc = SeededAtUtc,
            UpdatedAtUtc = SeededAtUtc,
        },
        new NotificationTemplate
        {
            Id = Guid.Parse("11111111-1111-4111-8111-111111111102"),
            Name = "Exam Reminder",
            Type = OnlineExamSystem.Notification.Domain.Enums.NotificationType.Reminder,
            SendEmail = true,
            SendInApp = false,
            Subject = "Reminder: {{examTitle}} starts soon",
            Body = "Hello {{studentName}},\n\n" +
                   "This is a reminder that your {{examTitle}} exam starts on {{startDate}}.\n" +
                   "Duration: {{duration}}.",
            IsActive = true,
            CreatedAtUtc = SeededAtUtc,
            UpdatedAtUtc = SeededAtUtc,
        },
        new NotificationTemplate
        {
            Id = Guid.Parse("11111111-1111-4111-8111-111111111103"),
            Name = "Result Published",
            Type = OnlineExamSystem.Notification.Domain.Enums.NotificationType.Result,
            SendEmail = true,
            SendInApp = true,
            Subject = "Your {{examTitle}} results are available",
            Body = "Hello {{studentName}},\n\n" +
                   "Your results for {{examTitle}} have been published.\n" +
                   "Log in to ExamVault to view your score.",
            IsActive = true,
            CreatedAtUtc = SeededAtUtc,
            UpdatedAtUtc = SeededAtUtc,
        },
        new NotificationTemplate
        {
            Id = Guid.Parse("11111111-1111-4111-8111-111111111104"),
            Name = "Account Created",
            Type = OnlineExamSystem.Notification.Domain.Enums.NotificationType.Account,
            SendEmail = true,
            SendInApp = false,
            Subject = "Account Update",
            Body = "Hello {{studentName}},\n\n[Write your account-related message here]",
            IsActive = true,
            CreatedAtUtc = SeededAtUtc,
            UpdatedAtUtc = SeededAtUtc,
        },
        new NotificationTemplate
        {
            Id = Guid.Parse("11111111-1111-4111-8111-111111111105"),
            Name = "System Announcement",
            Type = OnlineExamSystem.Notification.Domain.Enums.NotificationType.System,
            SendEmail = false,
            SendInApp = true,
            Subject = "ExamVault Announcement",
            Body = "Hello {{studentName}},\n\n[Write your announcement here]",
            IsActive = true,
            CreatedAtUtc = SeededAtUtc,
            UpdatedAtUtc = SeededAtUtc,
        },
    ];
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
