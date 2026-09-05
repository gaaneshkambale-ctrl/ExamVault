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

        assignment.CancelledAtUtc = DateTime.UtcNow;
        await _examRepository.SaveChangesAsync(cancellationToken);

        return CancelAssignmentResult.Ok();
    }
}
