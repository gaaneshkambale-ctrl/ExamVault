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

        // Instructor is restricted to assignments on exams they created
        // themselves - same "return null / effectively 404" treatment
        // GetExamHandler's own OwnedOnly scope already uses for an exam
        // outside scope, rather than a distinct 403.
        if (query.OwnerUserId is { } ownerUserId)
        {
            var exam = await _examRepository.GetByIdAsync(assignment.ExamId, cancellationToken);
            if (exam is null || exam.CreatedByUserId != ownerUserId)
            {
                return null;
            }
        }

        var targets = await _examRepository.GetAssignmentTargetUserIdsAsync(assignment.Id, cancellationToken);
        return new AssignmentWithTargets(assignment, targets);
    }
}
