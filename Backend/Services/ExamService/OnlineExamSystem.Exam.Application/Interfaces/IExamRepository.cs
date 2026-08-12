using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Interfaces;

public interface IExamRepository
{
    Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default);
    Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default);
    Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
