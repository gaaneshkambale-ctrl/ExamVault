using OnlineExamSystem.Exam.Application.Interfaces;
using OnlineExamSystem.Exam.Domain.Entities;

namespace OnlineExamSystem.Exam.Application.Exams.GetById;

public class GetExamHandler
{
    private readonly IExamRepository _examRepository;

    public GetExamHandler(IExamRepository examRepository)
    {
        _examRepository = examRepository;
    }

    public Task<ExamPaper?> HandleAsync(GetExamQuery query, CancellationToken cancellationToken = default) =>
        _examRepository.GetByIdAsync(query.Id, cancellationToken);
}
