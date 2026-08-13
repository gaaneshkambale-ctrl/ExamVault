using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Assignments.GetById;

public class GetAssignmentHandler
{
    private readonly IExamRepository _examRepository;

    public GetAssignmentHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<AssignmentWithTargets?> HandleAsync(
        GetAssignmentQuery query,
        CancellationToken cancellationToken = default)
    {
        var assignment = await _examRepository.GetAssignmentByIdAsync(query.AssignmentId, cancellationToken);
        if (assignment is null)
        {
            return null;
        }

        var targets = await _examRepository.GetAssignmentTargetUserIdsAsync(assignment.Id, cancellationToken);
        return new AssignmentWithTargets(assignment, targets);
    }
}
