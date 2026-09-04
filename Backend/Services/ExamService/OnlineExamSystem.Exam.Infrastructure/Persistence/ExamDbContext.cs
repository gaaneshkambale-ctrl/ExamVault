using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Exam.Infrastructure.Persistence;

public class ExamDbContext : TenantScopedDbContext
{
    public ExamDbContext(DbContextOptions<ExamDbContext> options, ICurrentTenant currentTenant)
        : base(options, currentTenant)
    {
    }

    public DbSet<ExamPaper> Exams => Set<ExamPaper>();
    public DbSet<ExamType> ExamTypes => Set<ExamType>();
    public DbSet<Section> Sections => Set<Section>();
    public DbSet<ExamAssignment> ExamAssignments => Set<ExamAssignment>();
    public DbSet<ExamAssignmentTarget> ExamAssignmentTargets => Set<ExamAssignmentTarget>();
    public DbSet<ExamReminderLog> ExamReminderLogs => Set<ExamReminderLog>();
    public DbSet<ReminderSettings> ReminderSettings => Set<ReminderSettings>();
    public DbSet<ProctoringSettings> ProctoringSettings => Set<ProctoringSettings>();
    public DbSet<ExamDefaults> ExamDefaults => Set<ExamDefaults>();

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
            entity.Property(e => e.ExamCode).HasMaxLength(40);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.Tags).HasMaxLength(500);
            entity.Property(e => e.Instructions).HasMaxLength(2000);
            entity.Property(e => e.NegativeMarks).HasColumnType("decimal(5,2)");
            entity.HasIndex(e => e.TenantId);
            entity.HasOne(e => e.ExamType)
                .WithMany()
                .HasForeignKey(e => e.ExamTypeId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && e.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ExamType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Purpose).HasMaxLength(500);
        });

        modelBuilder.Entity<Section>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(200);
            entity.Property(s => s.Description).HasMaxLength(2000);
            entity.Property(s => s.Instructions).HasMaxLength(2000);
            entity.Property(s => s.NegativeMarks).HasColumnType("decimal(5,2)");
            entity.HasIndex(s => s.TenantId);
            entity.HasOne<ExamPaper>()
                .WithMany()
                .HasForeignKey(s => s.ExamId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(s =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && s.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ExamAssignment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.AssignmentNumber).UseIdentityColumn();
            entity.HasIndex(a => a.AssignmentNumber).IsUnique();
            entity.Property(a => a.TimeZoneId).IsRequired().HasMaxLength(100);
            entity.HasIndex(a => a.TenantId);
            entity.HasOne<ExamPaper>()
                .WithMany()
                .HasForeignKey(a => a.ExamId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(a =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && a.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ExamAssignmentTarget>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => new { t.ExamAssignmentId, t.UserId }).IsUnique();
            entity.HasOne<ExamAssignment>()
                .WithMany()
                .HasForeignKey(t => t.ExamAssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(t =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && t.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ExamReminderLog>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => new { r.AssignmentId, r.UserId, r.Window }).IsUnique();
            entity.HasOne<ExamAssignment>()
                .WithMany()
                .HasForeignKey(r => r.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(r =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && r.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ProctoringSettings>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.TenantId);
            entity.HasQueryFilter(p =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && p.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ReminderSettings>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.TenantId);
            entity.HasQueryFilter(r =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && r.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<ExamDefaults>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NegativeMarkingValue).HasColumnType("decimal(5,2)");
            entity.Property(e => e.QuestionNavigationMode).HasConversion<string>();
            entity.Property(e => e.ResultPublishingMode).HasConversion<string>();
            entity.HasIndex(e => e.TenantId);
            entity.HasQueryFilter(e =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && e.TenantId == CurrentTenant.TenantId));
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
