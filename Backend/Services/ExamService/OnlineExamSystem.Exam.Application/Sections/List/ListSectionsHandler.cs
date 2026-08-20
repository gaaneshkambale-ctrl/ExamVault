using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Sections.List;

public class ListSectionsHandler
{
    private readonly IExamRepository _examRepository;

    public ListSectionsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<IReadOnlyList<Section>> HandleAsync(
        ListSectionsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetSectionsByExamIdAsync(query.ExamId, cancellationToken);
}
