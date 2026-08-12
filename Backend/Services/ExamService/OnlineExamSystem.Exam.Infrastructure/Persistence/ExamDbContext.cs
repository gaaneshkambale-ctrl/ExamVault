using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Infrastructure.Persistence;

public class ExamDbContext : DbContext
{
    public ExamDbContext(DbContextOptions<ExamDbContext> options) : base(options)
    {
    }

    public DbSet<ExamPaper> Exams => Set<ExamPaper>();

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
    }
}
