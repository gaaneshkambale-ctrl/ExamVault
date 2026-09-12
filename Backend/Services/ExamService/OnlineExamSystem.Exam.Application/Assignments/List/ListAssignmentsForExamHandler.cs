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
        // Instructor is restricted to assignments on exams they created
        // themselves - an exam outside scope returns an empty list here,
        // same "not visible" treatment ExamsController's own OwnedOnly
        // scope already gives an exam list outside scope, rather than a
        // distinct error.
        if (query.OwnerUserId is { } ownerUserId)
        {
            var exam = await _examRepository.GetByIdAsync(query.ExamId, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return [];
            }
        }

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
