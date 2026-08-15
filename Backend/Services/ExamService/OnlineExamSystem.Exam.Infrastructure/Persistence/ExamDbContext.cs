using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Infrastructure.Persistence;

public class ExamDbContext : DbContext
{
    public ExamDbContext(DbContextOptions<ExamDbContext> options) : base(options)
    {
    }

    public DbSet<ExamPaper> Exams => Set<ExamPaper>();
    public DbSet<ExamAssignment> ExamAssignments => Set<ExamAssignment>();
    public DbSet<ExamAssignmentTarget> ExamAssignmentTargets => Set<ExamAssignmentTarget>();
    public DbSet<ExamReminderLog> ExamReminderLogs => Set<ExamReminderLog>();
    public DbSet<ReminderSettings> ReminderSettings => Set<ReminderSettings>();

    // SQL Server's datetime2 columns don't preserve DateTimeKind, so EF Core
    // reads every DateTime back as Kind=Unspecified. System.Text.Json then
    // serializes those without a trailing "Z", and the browser parses the
    // resulting ISO string as local time instead of UTC. Assignment
    // Start/EndAtUtc now drive real client-side date math (status
    // computation), so this gets the same fix Submission Service needed
    // for its exam timer on Day 33 - forcing Kind=Utc on every read.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ExamPaper>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Instructions).HasMaxLength(2000);
            entity.Property(e => e.NegativeMarks).HasColumnType("decimal(5,2)");
        });

        modelBuilder.Entity<ExamAssignment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.AssignmentNumber).UseIdentityColumn();
            entity.HasIndex(a => a.AssignmentNumber).IsUnique();
            entity.Property(a => a.TimeZoneId).IsRequired().HasMaxLength(100);
            entity.HasOne<ExamPaper>()
                .WithMany()
                .HasForeignKey(a => a.ExamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExamAssignmentTarget>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => new { t.ExamAssignmentId, t.UserId }).IsUnique();
            entity.HasOne<ExamAssignment>()
                .WithMany()
                .HasForeignKey(t => t.ExamAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExamReminderLog>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => new { r.AssignmentId, r.UserId, r.Window }).IsUnique();
            entity.HasOne<ExamAssignment>()
                .WithMany()
                .HasForeignKey(r => r.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
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
