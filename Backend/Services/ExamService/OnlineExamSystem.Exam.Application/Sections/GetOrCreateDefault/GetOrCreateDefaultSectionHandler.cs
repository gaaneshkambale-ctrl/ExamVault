using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Sections.GetOrCreateDefault;

/// <summary>
/// Gives exams that don't use the section wizard a single implicit section to hang
/// questions off of, so Question Assignment has somewhere to save to. Idempotent: once a
/// section exists for the exam (default or otherwise), that first section is reused.
/// </summary>
public class GetOrCreateDefaultSectionHandler
{
    private readonly IExamRepository _examRepository;

    public GetOrCreateDefaultSectionHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<Section?> HandleAsync(
        GetOrCreateDefaultSectionQuery query,
        CancellationToken cancellationToken = default)
    {
        var exam = await _examRepository.GetByIdAsync(query.ExamId, cancellationToken);
        if (exam is null)
        {
            return null;
        }

        var sections = await _examRepository.GetSectionsByExamIdAsync(query.ExamId, cancellationToken);
        if (sections.Count > 0)
        {
            return sections[0];
        }

        var section = new Section
        {
            ExamId = query.ExamId,
            Name = "General",
            DisplayOrder = 0,
            DurationMinutes = exam.DurationMinutes,
        };

        await _examRepository.AddSectionAsync(section, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return section;
    }
}
