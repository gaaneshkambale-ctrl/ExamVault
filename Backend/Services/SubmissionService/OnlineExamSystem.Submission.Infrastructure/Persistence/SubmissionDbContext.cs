using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Infrastructure.Persistence;

public class SubmissionDbContext : DbContext
{
    public SubmissionDbContext(DbContextOptions<SubmissionDbContext> options) : base(options)
    {
    }

    public DbSet<ExamAttempt> ExamAttempts => Set<ExamAttempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();
    public DbSet<AttemptSectionState> AttemptSectionStates => Set<AttemptSectionState>();
    public DbSet<ViolationEvent> ViolationEvents => Set<ViolationEvent>();

    // SQL Server's datetime2 columns don't preserve DateTimeKind, so EF Core
    // reads every DateTime back as Kind=Unspecified. System.Text.Json then
    // serializes those without a trailing "Z", and the browser parses the
    // resulting ISO string as local time instead of UTC - badly wrong for
    // the exam timer's Started/SubmittedAtUtc math. Forcing Kind=Utc on
    // every read keeps every DateTime in this context honestly UTC end to end.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ExamAttempt>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.ExamId, a.UserId });
        });

        modelBuilder.Entity<AttemptAnswer>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.AttemptId, a.QuestionId }).IsUnique();
            entity.Property(a => a.AnswerText).HasMaxLength(4000);
            entity.Property(a => a.SelectedOptionIdsJson).HasMaxLength(4000);
            entity.HasOne<ExamAttempt>()
                .WithMany()
                .HasForeignKey(a => a.AttemptId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AttemptSectionState>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.AttemptId, a.SectionId }).IsUnique();
            entity.HasOne<ExamAttempt>()
                .WithMany()
                .HasForeignKey(a => a.AttemptId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ViolationEvent>(entity =>
        {
            entity.HasKey(v => v.Id);
            entity.HasIndex(v => v.AttemptId);
            entity.HasOne<ExamAttempt>()
                .WithMany()
                .HasForeignKey(v => v.AttemptId)
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
