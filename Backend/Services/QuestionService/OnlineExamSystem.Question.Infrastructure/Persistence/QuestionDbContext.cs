using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Question.Domain.Entities;
using OnlineExamSystem.Shared.Common.Multitenancy;

namespace OnlineExamSystem.Question.Infrastructure.Persistence;

public class QuestionDbContext : TenantScopedDbContext
{
    public QuestionDbContext(DbContextOptions<QuestionDbContext> options, ICurrentTenant currentTenant)
        : base(options, currentTenant)
    {
    }

    public DbSet<ExamQuestion> Questions => Set<ExamQuestion>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionParameter> QuestionParameters => Set<QuestionParameter>();
    public DbSet<QuestionTestCase> QuestionTestCases => Set<QuestionTestCase>();
    public DbSet<QuestionSqlTestCase> QuestionSqlTestCases => Set<QuestionSqlTestCase>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ExamQuestion>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.Property(q => q.QuestionText).IsRequired().HasMaxLength(2000);
            entity.Property(q => q.StarterCode).HasMaxLength(4000);
            entity.Property(q => q.ProgrammingLanguage).HasMaxLength(50);
            entity.Property(q => q.SampleAnswer).HasMaxLength(4000);
            entity.Property(q => q.FunctionName).HasMaxLength(200);
            entity.HasIndex(q => q.TenantId);
            entity.HasQueryFilter(q =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && q.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<QuestionOption>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.OptionText).IsRequired().HasMaxLength(500);
            entity.HasOne<ExamQuestion>()
                .WithMany()
                .HasForeignKey(o => o.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(o =>
                CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && o.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<QuestionParameter>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(100);
            entity.HasOne<ExamQuestion>()
                .WithMany()
                .HasForeignKey(p => p.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuestionTestCase>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.ArgumentsJson).IsRequired().HasMaxLength(2000);
            entity.Property(t => t.ExpectedOutputJson).IsRequired().HasMaxLength(2000);
            entity.HasOne<ExamQuestion>()
                .WithMany()
                .HasForeignKey(t => t.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuestionSqlTestCase>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.SetupSql).IsRequired();
            entity.HasOne<ExamQuestion>()
                .WithMany()
                .HasForeignKey(t => t.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
