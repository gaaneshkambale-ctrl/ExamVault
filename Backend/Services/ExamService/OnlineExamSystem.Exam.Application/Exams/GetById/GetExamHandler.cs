using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;
using OnlineExamSystem.Exam.Domain.Enums;

namespace OnlineExamSystem.Exam.Application.Exams.GetById;

public class GetExamHandler
{
    private readonly IExamRepository _examRepository;

    public GetExamHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public async Task<ExamPaper?> HandleAsync(GetExamQuery query, CancellationToken cancellationToken = default)
    {
        var exam = await _examRepository.GetByIdAsync(query.Id, cancellationToken);
        if (exam is null)
        {
            return null;
        }

        if (query.IsAdmin)
        {
            return exam;
        }

        // Deliberately not distinguishing "doesn't exist" from "not assigned" -
        // both look like a 404 to a student who wasn't given access.
        if (exam.Status != ExamStatus.Published)
        {
            return null;
        }

        var isAssigned = await _examRepository.IsUserAssignedAsync(query.Id, query.CallerId, cancellationToken);
        return isAssigned ? exam : null;
    }
}
