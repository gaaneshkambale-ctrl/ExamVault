using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Submission.Domain.Entities;

namespace OnlineExamSystem.Submission.Infrastructure.Persistence;

public class SubmissionDbContext : DbContext
{
    public SubmissionDbContext(DbContextOptions<SubmissionDbContext> options) : base(options)
    {
    }

    public DbSet<ExamAttempt> ExamAttempts => Set<ExamAttempt>();
    public DbSet<AttemptAnswer> AttemptAnswers => Set<AttemptAnswer>();

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
            entity.HasOne<ExamAttempt>()
                .WithMany()
                .HasForeignKey(a => a.AttemptId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
