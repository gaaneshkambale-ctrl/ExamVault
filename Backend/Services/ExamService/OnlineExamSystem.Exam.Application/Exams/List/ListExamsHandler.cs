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
        query.Scope switch
        {
            ExamAccessScope.All => _examRepository.GetAllAsync(cancellationToken),
            ExamAccessScope.OwnedOnly => _examRepository.GetOwnedAsync(query.CallerId, cancellationToken),
            _ => _examRepository.GetAssignedPublishedExamsAsync(query.CallerId, cancellationToken),
        };
}
