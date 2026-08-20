using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Sections.GetById;

public class GetSectionHandler
{
    private readonly IExamRepository _examRepository;

    public GetSectionHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<Section?> HandleAsync(GetSectionQuery query, CancellationToken cancellationToken = default) =>
        _examRepository.GetSectionByIdAsync(query.SectionId, cancellationToken);
}
