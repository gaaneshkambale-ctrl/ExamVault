using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Assignments.Delete;

public class DeleteAssignmentHandler
{
    private readonly IExamRepository _examRepository;

    public DeleteAssignmentHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<DeleteAssignmentResult> HandleAsync(
        DeleteAssignmentCommand command,
        CancellationToken cancellationToken = default)
    {
        var removed = await _examRepository.RemoveAssignmentAsync(command.AssignmentId, cancellationToken);
        if (!removed)
        {
            return DeleteAssignmentResult.NotFound();
        }

        await _examRepository.SaveChangesAsync(cancellationToken);
        return DeleteAssignmentResult.Ok();
    }
}
