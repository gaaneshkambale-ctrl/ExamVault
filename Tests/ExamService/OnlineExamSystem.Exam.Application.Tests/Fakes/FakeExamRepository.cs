using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Tests.Fakes;

public class FakeExamRepository : IExamRepository
{
    private readonly List<ExamPaper> _exams = [];

    public IReadOnlyList<ExamPaper> Exams => _exams;

    public Task AddAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _exams.Add(exam);
        return Task.CompletedTask;
    }

    public Task<ExamPaper?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(_exams.FirstOrDefault(e => e.Id == id));

    public Task<IReadOnlyList<ExamPaper>> GetAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ExamPaper>>(_exams.OrderByDescending(e => e.CreatedAtUtc).ToList());

    public Task RemoveAsync(ExamPaper exam, CancellationToken cancellationToken = default)
    {
        _exams.RemoveAll(e => e.Id == exam.Id);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
