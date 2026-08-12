using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Exams.List;

public class ListExamsHandler
{
    private readonly IExamRepository _examRepository;

    public ListExamsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<IReadOnlyList<ExamPaper>> HandleAsync(
        ListExamsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetAllAsync(cancellationToken);
}
