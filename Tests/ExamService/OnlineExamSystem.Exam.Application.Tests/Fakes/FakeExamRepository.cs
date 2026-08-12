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

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}
