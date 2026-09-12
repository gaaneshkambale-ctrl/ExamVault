using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Assignments.Cancel;

public class CancelAssignmentHandler
{
    private readonly IExamRepository _examRepository;

    public CancelAssignmentHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<CancelAssignmentResult> HandleAsync(
        CancelAssignmentCommand command,
        CancellationToken cancellationToken = default)
    {
        var assignment = await _examRepository.GetAssignmentByIdAsync(command.AssignmentId, cancellationToken);
        if (assignment is null)
        {
            return CancelAssignmentResult.NotFound();
        }

        if (command.OwnerUserId is { } ownerUserId)
        {
            var exam = await _examRepository.GetByIdAsync(assignment.ExamId, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return CancelAssignmentResult.Forbidden();
            }
        }

        assignment.CancelledAtUtc = DateTime.UtcNow;
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CancelAssignmentResult.Ok();
    }
}
