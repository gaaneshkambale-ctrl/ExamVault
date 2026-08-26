using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Sections.Reorder;

public class ReorderSectionsHandler
{
    private readonly IExamRepository _examRepository;

    public ReorderSectionsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task HandleAsync(ReorderSectionsCommand command, CancellationToken cancellationToken = default)
    {
        await _examRepository.ReorderSectionsAsync(command.ExamId, command.Order, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);
    }
}
