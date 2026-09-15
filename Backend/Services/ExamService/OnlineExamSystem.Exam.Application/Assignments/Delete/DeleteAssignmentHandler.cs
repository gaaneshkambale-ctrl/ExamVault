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
        if (command.OwnerUserId is { } ownerUserId)
        {
            var assignment = await _examRepository.GetAssignmentByIdAsync(command.AssignmentId, cancellationToken);
            if (assignment is null)
            {
                return DeleteAssignmentResult.NotFound();
            }

            var exam = await _examRepository.GetByIdAsync(assignment.ExamId, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return DeleteAssignmentResult.Forbidden();
            }
        }

        var removed = await _examRepository.RemoveAssignmentAsync(command.AssignmentId, cancellationToken);
        if (!removed)
        {
            return DeleteAssignmentResult.NotFound();
        }

        await _examRepository.SaveChangesAsync(cancellationToken);
        return DeleteAssignmentResult.Ok();
    }
}
