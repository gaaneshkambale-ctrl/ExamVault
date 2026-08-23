using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.ExamTypes.List;

public class ListExamTypesHandler
{
    private readonly IExamRepository _examRepository;

    public ListExamTypesHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<IReadOnlyList<ExamType>> HandleAsync(CancellationToken cancellationToken = default) =>
        _examRepository.GetAllExamTypesAsync(cancellationToken);
}
