using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Assignments.List;

public class ListAssignmentsForExamHandler
{
    private readonly IExamRepository _examRepository;

    public ListAssignmentsForExamHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<IReadOnlyList<AssignmentWithTargets>> HandleAsync(
        ListAssignmentsForExamQuery query,
        CancellationToken cancellationToken = default)
    {
        var assignments = await _examRepository.GetAssignmentsForExamAsync(query.ExamId, cancellationToken);
        var result = new List<AssignmentWithTargets>();
        foreach (var assignment in assignments)
        {
            var targets = await _examRepository.GetAssignmentTargetUserIdsAsync(assignment.Id, cancellationToken);
            result.Add(new AssignmentWithTargets(assignment, targets));
        }

        return result;
    }
}
