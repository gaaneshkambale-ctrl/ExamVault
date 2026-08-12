using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Infrastructure.Persistence;

namespace OnlineExamSystem.Exam.Infrastructure.Repositories;

public class ExamRepository : IExamRepository
{
    private readonly ExamDbContext _dbContext;

    public ExamRepository(ExamDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default) =>
        _dbContext.Exams.AddAsync(exam, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
