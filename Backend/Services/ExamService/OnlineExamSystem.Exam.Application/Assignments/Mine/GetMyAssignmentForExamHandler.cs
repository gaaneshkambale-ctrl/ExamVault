using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Assignments.Mine;

public class GetMyAssignmentForExamHandler
{
    private readonly IExamRepository _examRepository;

    public GetMyAssignmentForExamHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<ExamAssignment?> HandleAsync(
        GetMyAssignmentForExamQuery query,
        CancellationToken cancellationToken = default) =>
        _examRepository.GetAssignmentForUserAndExamAsync(query.ExamId, query.UserId, cancellationToken);
}
