using Microsoft.EntityFrameworkCore;
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

    public Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _dbContext.Exams.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _dbContext.Exams
            .OrderByDescending(e => e.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
