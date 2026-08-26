using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.ExamTypes.Delete;

public class DeleteExamTypeHandler
{
    private readonly IExamRepository _examRepository;

    public DeleteExamTypeHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<DeleteExamTypeResult> HandleAsync(
        DeleteExamTypeCommand command,
        CancellationToken cancellationToken = default)
    {
        var removed = await _examRepository.RemoveExamTypeAsync(command.ExamTypeId, cancellationToken);
        if (!removed)
        {
            return DeleteExamTypeResult.NotFound();
        }

        await _examRepository.SaveChangesAsync(cancellationToken);
        return DeleteExamTypeResult.Ok();
    }
}
