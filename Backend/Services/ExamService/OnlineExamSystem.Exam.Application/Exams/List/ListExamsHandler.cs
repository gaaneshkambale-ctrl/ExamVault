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
        query.IsAdmin
            ? _examRepository.GetAllAsync(cancellationToken)
            : _examRepository.GetAssignedPublishedExamsAsync(query.CallerId, cancellationToken);
}
