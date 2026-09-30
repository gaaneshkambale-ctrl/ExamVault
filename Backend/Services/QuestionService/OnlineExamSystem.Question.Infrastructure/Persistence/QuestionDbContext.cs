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
    public DbSet<BankSubject> BankSubjects => Set<BankSubject>();
    public DbSet<BankTopic> BankTopics => Set<BankTopic>();
    public DbSet<BankTag> BankTags => Set<BankTag>();
    public DbSet<BankQuestion> BankQuestions => Set<BankQuestion>();
    public DbSet<BankQuestionOption> BankQuestionOptions => Set<BankQuestionOption>();
    public DbSet<BankQuestionTag> BankQuestionTags => Set<BankQuestionTag>();

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
            entity.Property(q => q.SampleInput).HasMaxLength(2000);
            entity.Property(q => q.SampleOutput).HasMaxLength(2000);
            entity.Property(q => q.Constraints).HasMaxLength(2000);
            entity.HasIndex(q => q.TenantId);
            entity.HasIndex(q => q.SourceBankQuestionId);
            entity.Property(q => q.NegativeMarks).HasPrecision(5, 2);
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

        ConfigureQuestionBank(modelBuilder);
    }

    // Question Bank: organization-owned taxonomy + reusable questions. Every
    // table carries the same tenant query filter as the exam-question tables,
    // and names are unique per tenant (not globally).
    private void ConfigureQuestionBank(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BankSubject>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(150);
            entity.Property(s => s.Description).HasMaxLength(500);
            entity.HasIndex(s => new { s.TenantId, s.Name }).IsUnique();
            entity.HasQueryFilter(s => CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && s.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<BankTopic>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(150);
            entity.HasIndex(t => new { t.TenantId, t.SubjectId, t.Name }).IsUnique();
            entity.HasOne<BankSubject>().WithMany().HasForeignKey(t => t.SubjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(t => CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && t.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<BankTag>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).IsRequired().HasMaxLength(150);
            entity.HasIndex(t => new { t.TenantId, t.Name }).IsUnique();
            entity.HasQueryFilter(t => CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && t.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<BankQuestion>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.Property(q => q.QuestionText).IsRequired().HasMaxLength(2000);
            entity.Property(q => q.Explanation).HasMaxLength(2000);
            entity.Property(q => q.NegativeMarks).HasPrecision(5, 2);
            entity.Property(q => q.CodeSpecJson);
            entity.HasIndex(q => new { q.TenantId, q.SubjectId, q.TopicId });
            entity.HasIndex(q => new { q.TenantId, q.Status });
            entity.HasOne<BankSubject>().WithMany().HasForeignKey(q => q.SubjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BankTopic>().WithMany().HasForeignKey(q => q.TopicId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(q => CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && q.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<BankQuestionOption>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.OptionText).IsRequired().HasMaxLength(500);
            entity.HasOne<BankQuestion>().WithMany().HasForeignKey(o => o.QuestionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(o => CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && o.TenantId == CurrentTenant.TenantId));
        });

        modelBuilder.Entity<BankQuestionTag>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.HasIndex(l => new { l.QuestionId, l.TagId }).IsUnique();
            entity.HasOne<BankQuestion>().WithMany().HasForeignKey(l => l.QuestionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<BankTag>().WithMany().HasForeignKey(l => l.TagId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(l => CurrentTenant.IsSuperAdmin || (CurrentTenant.IsAuthenticated && l.TenantId == CurrentTenant.TenantId));
        });
    }
}
