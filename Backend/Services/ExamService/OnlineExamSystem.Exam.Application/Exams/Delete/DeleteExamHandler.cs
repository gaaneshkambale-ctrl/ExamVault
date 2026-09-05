using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Exams.Delete;

public class DeleteExamHandler
{
    private readonly IExamRepository _examRepository;

    public DeleteExamHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<DeleteExamResult> HandleAsync(
        DeleteExamCommand command,
        CancellationToken cancellationToken = default)
    {
        var exam = await _examRepository.GetByIdAsync(command.ExamId, cancellationToken);
        if (exam is null)
        {
            return DeleteExamResult.NotFound();
        }

        await _examRepository.RemoveAsync(exam, cancellationToken);
        await _examRepository.SaveChangesAsync(cancellationToken);

        return DeleteExamResult.Ok(exam.TenantId, exam.Title);
    }
}
