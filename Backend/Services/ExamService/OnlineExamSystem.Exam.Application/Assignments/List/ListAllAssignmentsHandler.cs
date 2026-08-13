using OnlineExamSystem.Exam.Application.Interfaces;

namespace OnlineExamSystem.Exam.Application.Assignments.List;

public class ListAllAssignmentsHandler
{
    private readonly IExamRepository _examRepository;

    public ListAllAssignmentsHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<IReadOnlyList<AssignmentWithExamTitle>> HandleAsync(
        ListAllAssignmentsQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetAllAssignmentsAsync(cancellationToken);
}
