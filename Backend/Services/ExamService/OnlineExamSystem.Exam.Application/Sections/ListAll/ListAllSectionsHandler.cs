using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Sections.ListAll;

// Super Admin platform-wide browse - relies on ExamDbContext's existing
// IsSuperAdmin query-filter bypass on Section (same one Sections/List's
// own per-exam endpoint already sits on top of) rather than any new
// tenant-scoping logic of its own.
public class ListAllSectionsHandler
{
    private readonly IExamRepository _examRepository;

    public ListAllSectionsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<IReadOnlyList<SectionWithExamTitle>> HandleAsync(
        ListAllSectionsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetAllSectionsAsync(cancellationToken);
}
